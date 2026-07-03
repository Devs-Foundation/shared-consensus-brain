const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { URL } = require("url");
const { execFile, execFileSync } = require("child_process");

const PORT = Number(process.env.PORT || 8787);
const HOST = "127.0.0.1";
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const APP_LOG_DIR = path.join(ROOT, "logs");
const APP_LOG_FILE = path.join(APP_LOG_DIR, "events.jsonl");
let lastCpuSnapshot = null;

const TEXT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const IGNORE_DIRS = new Set([
  ".git",
  ".obsidian",
  "node_modules",
  "_BACKUPS",
  ".trash",
  ".cache",
]);

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}

function json(res, status, value) {
  send(res, status, JSON.stringify(value), "application/json; charset=utf-8");
}

function bad(res, message, status = 400) {
  json(res, status, { ok: false, error: message });
}

function logEvent(vault, action, details = {}) {
  fs.mkdirSync(APP_LOG_DIR, { recursive: true });
  const event = {
    time: new Date().toISOString(),
    action,
    vault: vault ? path.basename(vault) : "",
    ...details,
  };
  fs.appendFileSync(APP_LOG_FILE, JSON.stringify(event) + "\n", "utf8");
}

function safeVault(input) {
  if (!input || !String(input).trim()) {
    throw new Error("Choose a local brain folder first");
  }
  const vault = path.resolve(String(input).trim());
  if (!fs.existsSync(vault)) throw new Error("Vault does not exist");
  if (!fs.statSync(vault).isDirectory()) throw new Error("Vault path is not a folder");
  return vault;
}

function safeFile(vault, rel) {
  const full = path.resolve(vault, rel || "");
  const relative = path.relative(vault, full);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Ficheiro fora do vault");
  }
  if (!full.toLowerCase().endsWith(".md")) {
    throw new Error("So e permitido abrir/gravar Markdown");
  }
  return full;
}

function walkMd(dir, base, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      walkMd(path.join(dir, entry.name), base, files);
      continue;
    }
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) continue;
    const full = path.join(dir, entry.name);
    const rel = path.relative(base, full).replaceAll(path.sep, "/");
    files.push({ full, rel });
  }
  return files;
}

function titleFromRel(rel) {
  return path.basename(rel, ".md").replaceAll("-", " ").replaceAll("_", " ");
}

function firstFolder(rel) {
  const parts = rel.split("/");
  return parts.length > 1 ? parts[0] : "raiz";
}

function wordsOf(text) {
  const cleaned = text
    .replace(/^---[\s\S]*?---/m, " ")
    .replace(/```[\s\S]*?```/g, " ");
  const m = cleaned.trim().match(/\S+/gu);
  return m ? m.length : 0;
}

function rootDirCaseInsensitive(vault, wanted) {
  const lower = wanted.toLowerCase();
  for (const entry of fs.readdirSync(vault, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name.toLowerCase() === lower) {
      return path.join(vault, entry.name);
    }
  }
  return null;
}

function mailMessageCount(vault) {
  const mailDir = rootDirCaseInsensitive(vault, "_CORREIO");
  if (!mailDir) return null;
  let messages = 0;
  for (const entry of fs.readdirSync(mailDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) continue;
    const base = entry.name.toLowerCase();
    if (base.startsWith("_protocolo")) continue;
    const isMailFile = base.startsWith("inbox-") || base.startsWith("outbox-");
    if (!isMailFile && !base.includes("correio") && !base.includes("tarefa")) continue;
    const text = fs.readFileSync(path.join(mailDir, entry.name), "utf8").trim();
    if (text) messages += 1;
  }
  return messages;
}

function searchTextOf(text) {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[[^\]]+\]\([^)]+\)/g, " ")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/[#>*_`~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);
}

function skillCount(vault) {
  const file = path.join(vault, "MASTER_SKILLS.md");
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, "utf8");
  const total = text.match(/Total:[\s\S]*?\*\*(\d+)\s+skills\*\*/i);
  if (total) return Number(total[1]);
  const vaultOnly = text.match(/Skills do Vault[^\n]*[—-]\s*(\d+)/i);
  return vaultOnly ? Number(vaultOnly[1]) : null;
}

function gitContributorCount(vault) {
  try {
    const gitDir = path.join(vault, ".git");
    if (!fs.existsSync(gitDir)) return null;
    const out = execFileSync("git", ["log", "--format=%aN <%aE>"], {
      cwd: vault,
      timeout: 12000,
      encoding: "utf8",
    });
    const authors = new Set();
    const lines = String(out || "").split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      const clean = line.trim().toLowerCase();
      if (clean) authors.add(clean);
    }
    return authors.size || null;
  } catch {
    return null;
  }
}

function gitBrainAgeDays(vault) {
  try {
    const gitDir = path.join(vault, ".git");
    if (!fs.existsSync(gitDir)) return null;
    const out = execFileSync("git", ["log", "--reverse", "--format=%ct"], {
      cwd: vault,
      timeout: 12000,
      encoding: "utf8",
    });
    const firstCommit = String(out || "").split(/\r?\n/).find(Boolean);
    const timestamp = Number(firstCommit);
    if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
    return Math.max(0, Math.floor((Date.now() - timestamp * 1000) / 86400000));
  } catch {
    return null;
  }
}

function extractWikiLinks(text) {
  const links = [];
  const wiki = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;
  let m;
  while ((m = wiki.exec(text))) {
    const raw = m[1].trim();
    if (raw) links.push(raw);
  }
  const md = /\[[^\]]+\]\(([^)]+\.md)(?:#[^)]+)?\)/gi;
  while ((m = md.exec(text))) {
    const raw = decodeURIComponent(m[1]).replace(/\\/g, "/").trim();
    if (raw) links.push(raw);
  }
  return links;
}

function normalizeLink(raw) {
  return raw.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\.md$/i, "");
}

function buildGraph(vault) {
  const files = walkMd(vault, vault);
  const byNoExt = new Map();
  const byBase = new Map();
  const docs = [];

  for (const item of files) {
    const stat = fs.statSync(item.full);
    const text = fs.readFileSync(item.full, "utf8");
    const noExt = item.rel.replace(/\.md$/i, "");
    const base = path.basename(noExt).toLowerCase();
    byNoExt.set(noExt.toLowerCase(), item.rel);
    if (!byBase.has(base)) byBase.set(base, []);
    byBase.get(base).push(item.rel);
    docs.push({
      id: item.rel,
      title: titleFromRel(item.rel),
      folder: firstFolder(item.rel),
      path: item.rel,
      size: stat.size,
      modified: stat.mtimeMs,
      words: wordsOf(text),
      searchText: searchTextOf(text),
      linksRaw: extractWikiLinks(text),
    });
  }

  const nodes = docs.map((doc) => ({
    id: doc.id,
    title: doc.title,
    folder: doc.folder,
    path: doc.path,
    size: doc.size,
    modified: doc.modified,
    words: doc.words,
    searchText: `${doc.title} ${doc.folder} ${doc.path} ${doc.searchText}`.toLowerCase(),
    degree: 0,
  }));
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const links = [];
  let unresolved = 0;

  for (const doc of docs) {
    const fromDir = path.dirname(doc.path).replaceAll("\\", "/");
    for (const raw of doc.linksRaw) {
      const cleaned = normalizeLink(raw);
      const candidates = [];
      candidates.push(cleaned.toLowerCase());
      if (fromDir && fromDir !== ".") candidates.push((fromDir + "/" + cleaned).toLowerCase());
      const base = path.basename(cleaned).toLowerCase();

      let target = null;
      for (const key of candidates) {
        if (byNoExt.has(key)) {
          target = byNoExt.get(key);
          break;
        }
      }
      if (!target && byBase.has(base) && byBase.get(base).length === 1) {
        target = byBase.get(base)[0];
      }
      if (!target || target === doc.id) {
        unresolved += 1;
        continue;
      }
      links.push({ source: doc.id, target, label: raw });
      nodeById.get(doc.id).degree += 1;
      nodeById.get(target).degree += 1;
    }
  }

  const folders = [...new Set(nodes.map((n) => n.folder))].sort((a, b) => a.localeCompare(b));
  const orphans = nodes.filter((node) => node.degree === 0).length;
  const totalBytes = docs.reduce((sum, doc) => sum + doc.size, 0);
  const totalWords = docs.reduce((sum, doc) => sum + doc.words, 0);
  return {
    ok: true,
    vault,
    generatedAt: new Date().toISOString(),
    stats: {
      files: docs.length,
      links: links.length,
      folders: folders.length,
      unresolved,
      orphans,
      totalBytes,
      totalWords,
      avgFileBytes: docs.length ? Math.max(1, Math.round(totalBytes / docs.length)) : 0,
      skills: skillCount(vault),
      contributors: gitContributorCount(vault),
      brainAgeDays: gitBrainAgeDays(vault),
      messages: mailMessageCount(vault),
    },
    folders,
    nodes,
    links,
  };
}

function changedFiles(vault, since) {
  const changed = [];
  for (const item of walkMd(vault, vault)) {
    const stat = fs.statSync(item.full);
    if (stat.mtimeMs > since) {
      changed.push({
        path: item.rel,
        title: titleFromRel(item.rel),
        modified: stat.mtimeMs,
      });
    }
  }
  changed.sort((a, b) => b.modified - a.modified);
  return changed.slice(0, 50);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 25 * 1024 * 1024) reject(new Error("Pedido demasiado grande"));
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function backupAndSave(vault, rel, content) {
  const full = safeFile(vault, rel);
  if (!fs.existsSync(full)) throw new Error("Ficheiro nao existe: " + rel);
  const original = fs.readFileSync(full);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(vault, "_BACKUPS", "cerebro-vivo", stamp);
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, rel.replace(/[\\/]/g, "__"));
  fs.writeFileSync(backupPath, original);
  fs.writeFileSync(full, content, "utf8");
  return path.relative(vault, backupPath).replaceAll(path.sep, "/");
}

function runGit(vault, args) {
  return new Promise((resolve) => {
    execFile("git", args, { cwd: vault, timeout: 120000 }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        code: error && typeof error.code === "number" ? error.code : 0,
        command: `git ${args.join(" ")}`,
        stdout: String(stdout || "").trim(),
        stderr: String(stderr || "").trim(),
      });
    });
  });
}

async function syncVault(vault) {
  const steps = [];
  steps.push(await runGit(vault, ["pull", "--rebase", "origin", "master"]));
  steps.push(await runGit(vault, ["status", "--porcelain"]));
  const status = steps[1].stdout;
  if (steps[0].ok && status) {
    steps.push(await runGit(vault, ["add", "-A"]));
    steps.push(await runGit(vault, ["commit", "-m", "cerebro vivo local sync"]));
    steps.push(await runGit(vault, ["push", "origin", "master"]));
  }
  steps.push(await runGit(vault, ["log", "-1", "--pretty=format:%h %an %ad %s", "--date=iso"]));
  return steps;
}

function readLogs(limit = 200) {
  if (!fs.existsSync(APP_LOG_FILE)) return [];
  const lines = fs.readFileSync(APP_LOG_FILE, "utf8").split(/\r?\n/).filter(Boolean);
  return lines.slice(-limit).map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return { time: "", action: "raw", message: line };
    }
  }).reverse();
}

function clearLogs() {
  fs.mkdirSync(APP_LOG_DIR, { recursive: true });
  fs.writeFileSync(APP_LOG_FILE, "", "utf8");
}

function cpuSnapshot() {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    idle += cpu.times.idle;
    total += Object.values(cpu.times).reduce((sum, value) => sum + value, 0);
  }
  return { idle, total };
}

function cpuUsagePercent() {
  const current = cpuSnapshot();
  if (!lastCpuSnapshot) {
    lastCpuSnapshot = current;
    return null;
  }
  const idle = current.idle - lastCpuSnapshot.idle;
  const total = current.total - lastCpuSnapshot.total;
  lastCpuSnapshot = current;
  if (total <= 0) return null;
  return Math.max(0, Math.min(100, (1 - idle / total) * 100));
}

function bytes(value) {
  return Math.max(0, Number(value || 0));
}

function runPowerShell(command) {
  return new Promise((resolve) => {
    execFile(
      "powershell",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
      { timeout: 12000 },
      (error, stdout) => {
        if (error) return resolve(null);
        resolve(String(stdout || "").trim());
      },
    );
  });
}

async function diskStats(vault) {
  if (process.platform === "win32") {
    const root = path.parse(vault).root.replace(/\\$/, "");
    const out = await runPowerShell(
      `Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='${root}'" | Select-Object Size,FreeSpace | ConvertTo-Json -Compress`,
    );
    if (!out) return null;
    try {
      const data = JSON.parse(out);
      const total = bytes(data.Size);
      const free = bytes(data.FreeSpace);
      return { total, free, used: Math.max(0, total - free) };
    } catch {
      return null;
    }
  }
  return null;
}

async function cpuTemperature() {
  if (process.platform !== "win32") return null;
  const out = await runPowerShell(
    "Get-CimInstance MSAcpi_ThermalZoneTemperature -Namespace root/wmi -ErrorAction SilentlyContinue | Select-Object -First 1 CurrentTemperature | ConvertTo-Json -Compress",
  );
  if (!out) return null;
  try {
    const data = JSON.parse(out);
    const kelvinTenths = Number(data.CurrentTemperature);
    if (!Number.isFinite(kelvinTenths) || kelvinTenths <= 0) return null;
    return (kelvinTenths / 10) - 273.15;
  } catch {
    return null;
  }
}

async function machineStats(vault) {
  const cpus = os.cpus();
  const totalMem = bytes(os.totalmem());
  const freeMem = bytes(os.freemem());
  const [disk, temperature] = await Promise.all([diskStats(vault), cpuTemperature()]);
  return {
    ok: true,
    host: os.hostname(),
    platform: `${os.type()} ${os.release()} (${os.arch()})`,
    cpu: {
      model: cpus[0] ? cpus[0].model : "Unknown CPU",
      cores: cpus.length,
      usage: cpuUsagePercent(),
    },
    memory: {
      total: totalMem,
      free: freeMem,
      used: totalMem - freeMem,
    },
    disk,
    temperature,
    uptime: os.uptime(),
    generatedAt: new Date().toISOString(),
  };
}

async function route(req, res) {
  if (req.method === "OPTIONS") return send(res, 204, "");
  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (url.pathname === "/api/default-vault") {
      return json(res, 200, { ok: true, path: "" });
    }

    if (url.pathname === "/api/graph") {
      const vault = safeVault(url.searchParams.get("vault"));
      logEvent(vault, "graph:index", { message: "Indexed graph" });
      return json(res, 200, buildGraph(vault));
    }

    if (url.pathname === "/api/changes") {
      const vault = safeVault(url.searchParams.get("vault"));
      const since = Number(url.searchParams.get("since") || 0);
      return json(res, 200, {
        ok: true,
        now: Date.now(),
        changed: changedFiles(vault, since),
      });
    }

    if (url.pathname === "/api/file") {
      const vault = safeVault(url.searchParams.get("vault"));
      const rel = url.searchParams.get("file");
      const full = safeFile(vault, rel);
      if (!fs.existsSync(full)) return bad(res, "Ficheiro nao encontrado", 404);
      logEvent(vault, "file:open", { file: rel });
      return json(res, 200, {
        ok: true,
        path: rel,
        content: fs.readFileSync(full, "utf8"),
        modified: fs.statSync(full).mtimeMs,
      });
    }

    if (url.pathname === "/api/save" && req.method === "POST") {
      const payload = JSON.parse(await readBody(req));
      const vault = safeVault(payload.vault);
      const backup = backupAndSave(vault, payload.file, String(payload.content ?? ""));
      logEvent(vault, "file:save", { file: payload.file, backup });
      return json(res, 200, { ok: true, backup });
    }

    if (url.pathname === "/api/logs") {
      return json(res, 200, { ok: true, logs: readLogs(Number(url.searchParams.get("limit") || 200)) });
    }

    if (url.pathname === "/api/logs/clear" && req.method === "POST") {
      clearLogs();
      return json(res, 200, { ok: true });
    }

    if (url.pathname === "/api/stats") {
      const vault = safeVault(url.searchParams.get("vault"));
      return json(res, 200, await machineStats(vault));
    }

    if (url.pathname === "/api/sync" && req.method === "POST") {
      const payload = JSON.parse(await readBody(req));
      const vault = safeVault(payload.vault);
      logEvent(vault, "git:sync:start", { message: "Manual sync started" });
      const steps = await syncVault(vault);
      const ok = steps.every((step) => step.ok);
      logEvent(vault, ok ? "git:sync:done" : "git:sync:error", {
        message: ok ? "Manual sync finished" : "Manual sync failed",
        steps,
      });
      return json(res, 200, { ok, steps });
    }

    let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
    filePath = path.normalize(filePath).replace(/^(\.\.[\\/])+/, "");
    const full = path.join(PUBLIC, filePath);
    if (!full.startsWith(PUBLIC) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
      return send(res, 404, "Not found", "text/plain; charset=utf-8");
    }
    const ext = path.extname(full).toLowerCase();
    return send(res, 200, fs.readFileSync(full), TEXT_TYPES[ext] || "application/octet-stream");
  } catch (err) {
    return bad(res, err.message || String(err), 500);
  }
}

http.createServer(route).listen(PORT, HOST, () => {
  console.log(`Cerebro Vivo open at http://${HOST}:${PORT}`);
  console.log("Choose a local brain folder in the app.");
});
