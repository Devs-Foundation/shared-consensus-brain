const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { URL } = require("url");
const { execFile, execFileSync } = require("child_process");

const PORT = Number(process.env.PORT || 8787);
const HOST = "127.0.0.1";
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const APP_DATA_DIR = path.join(ROOT, "data");
const FAVORITES_FILE = path.join(APP_DATA_DIR, "favorites.json");
const APP_LOG_DIR = path.join(ROOT, "logs");
const APP_LOG_FILE = path.join(APP_LOG_DIR, "events.jsonl");
let lastCpuSnapshot = null;
const vaultSizeCache = new Map();

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
  ".archive",
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

function shortText(value, max = 180) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function safeGitConfig(vault, key) {
  if (!vault || !fs.existsSync(path.join(vault, ".git"))) return "";
  try {
    return shortText(execFileSync("git", ["config", "--get", key], {
      cwd: vault,
      timeout: 5000,
      encoding: "utf8",
    }));
  } catch {
    return "";
  }
}

function eventActor(vault) {
  const gitName = safeGitConfig(vault, "user.name");
  if (gitName) {
    return {
      name: gitName,
      machine: os.hostname(),
      source: "git-config",
    };
  }

  try {
    const user = os.userInfo().username;
    if (user) {
      return {
        name: user,
        machine: os.hostname(),
        source: "local-user",
      };
    }
  } catch {
    // No useful local identity available.
  }

  return null;
}

function requestOrigin(req) {
  if (!req) return null;
  const ua = shortText(req.headers["user-agent"] || "", 120);
  const browser = ua.includes("Edg/")
    ? "Edge"
    : ua.includes("Brave")
      ? "Brave"
      : ua.includes("Chrome/")
        ? "Chrome"
        : ua.includes("Firefox/")
          ? "Firefox"
          : ua ? "Browser" : "";
  return {
    address: req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : "local",
    client: browser,
  };
}

function eventLabel(action, details = {}) {
  const labels = {
    "graph:index": "Indexed graph",
    "file:open": "Opened note",
    "file:save": "Saved note",
    "file:delete": "Deleted note",
    "file:create": "Created note",
    "favorite:add": "Added favorite",
    "favorite:remove": "Removed favorite",
    "git:sync:start": "Started manual sync",
    "git:sync:done": "Finished manual sync",
    "git:sync:error": "Manual sync failed",
    "git:diff": "Generated git diff",
    "brain:validate": "Validated brain",
    "folder:open": "Opened brain folder",
    "backup:list": "Listed backups",
    "backup:create": "Created full backup",
    "backup:delete": "Deleted backup",
    "backup:open": "Opened backup folder",
    "logs:clear": "Cleared local logs",
  };
  const base = labels[action] || action;
  return details.file ? `${base}: ${details.file}` : base;
}

function logEvent(vault, action, details = {}, req = null) {
  fs.mkdirSync(APP_LOG_DIR, { recursive: true });
  const actor = eventActor(vault);
  const origin = requestOrigin(req);
  const event = {
    time: new Date().toISOString(),
    action,
    label: eventLabel(action, details),
    vault: vault ? path.basename(vault) : "",
  };
  if (actor) event.actor = actor;
  if (origin) event.origin = origin;
  Object.assign(event, details);
  fs.appendFileSync(APP_LOG_FILE, JSON.stringify(event) + "\n", "utf8");
}

function vaultKey(vault) {
  return crypto.createHash("sha256").update(path.resolve(vault)).digest("hex").slice(0, 24);
}

function readFavoritesStore() {
  if (!fs.existsSync(FAVORITES_FILE)) return {};
  try {
    const data = JSON.parse(fs.readFileSync(FAVORITES_FILE, "utf8"));
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

function writeFavoritesStore(store) {
  fs.mkdirSync(APP_DATA_DIR, { recursive: true });
  fs.writeFileSync(FAVORITES_FILE, JSON.stringify(store, null, 2), "utf8");
}

function favoritesForVault(vault) {
  const store = readFavoritesStore();
  const items = store[vaultKey(vault)];
  return Array.isArray(items) ? items.filter((item) => typeof item === "string") : [];
}

function setFavorite(vault, rel, favorite) {
  const full = safeFile(vault, rel);
  if (favorite && !fs.existsSync(full)) throw new Error("Ficheiro nao encontrado");
  const store = readFavoritesStore();
  const key = vaultKey(vault);
  const current = new Set(Array.isArray(store[key]) ? store[key] : []);
  const cleanRel = path.relative(vault, full).replaceAll(path.sep, "/");
  if (favorite) current.add(cleanRel);
  else current.delete(cleanRel);
  store[key] = Array.from(current).sort((a, b) => a.localeCompare(b));
  writeFavoritesStore(store);
  return store[key];
}

function removeFavorite(vault, rel) {
  const store = readFavoritesStore();
  const key = vaultKey(vault);
  const current = new Set(Array.isArray(store[key]) ? store[key] : []);
  current.delete(String(rel || "").replace(/\\/g, "/"));
  store[key] = Array.from(current).sort((a, b) => a.localeCompare(b));
  writeFavoritesStore(store);
  return store[key];
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

function safeFolder(vault, rel) {
  const full = path.resolve(vault, rel || "");
  const relative = path.relative(vault, full);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Pasta fora do vault");
  }
  return full;
}

function browseFolder(vault, rel = "") {
  const dir = safeFolder(vault, rel);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new Error("Folder not found");
  }

  const cleanDir = path.relative(vault, dir).replaceAll(path.sep, "/");
  const parent = cleanDir ? path.dirname(cleanDir).replaceAll("\\", "/") : "";
  const items = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      items.push({
        type: "folder",
        name: entry.name,
        path: path.relative(vault, full).replaceAll(path.sep, "/"),
      });
      continue;
    }

    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) continue;
    const full = path.join(dir, entry.name);
    const relPath = path.relative(vault, full).replaceAll(path.sep, "/");
    const text = fs.readFileSync(full, "utf8");
    items.push({
      type: "file",
      name: entry.name,
      path: relPath,
      title: titleFromContent(text, relPath),
      bytes: fs.statSync(full).size,
    });
  }

  items.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return {
    ok: true,
    dir: cleanDir === "." ? "" : cleanDir,
    parent: parent === "." ? "" : parent,
    items,
  };
}

function slugFileName(name) {
  const clean = String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\.md$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${clean || "new-note"}.md`;
}

function createNewNote(vault, folder, title, contextLinks = []) {
  const dir = safeFolder(vault, folder || "");
  fs.mkdirSync(dir, { recursive: true });
  const baseName = slugFileName(title);
  const stem = baseName.replace(/\.md$/i, "");
  const duplicate = walkMd(vault, vault).find((item) => path.basename(item.rel, ".md").toLowerCase() === stem.toLowerCase());
  if (duplicate) {
    throw new Error(`A note with this name already exists: ${duplicate.rel}`);
  }
  let name = baseName;
  let full = path.join(dir, name);
  let index = 2;
  while (fs.existsSync(full)) {
    name = `${stem}-${index}.md`;
    full = path.join(dir, name);
    index += 1;
  }
  const heading = String(title || "").trim() || name.replace(/\.md$/i, "").replaceAll("-", " ");
  const links = Array.from(new Set((Array.isArray(contextLinks) ? contextLinks : [])
    .map((link) => String(link || "").trim().replace(/\.md$/i, ""))
    .filter(Boolean)))
    .slice(0, 6);
  const linkedContext = links.length
    ? `\n## Linked context\n\n${links.map((link) => `- [[${link}]]`).join("\n")}\n`
    : "";
  const content = `# ${heading}\n${linkedContext}\n`;
  fs.writeFileSync(full, content, "utf8");
  return {
    rel: path.relative(vault, full).replaceAll(path.sep, "/"),
    content,
  };
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

function titleFromContent(text, rel) {
  const frontmatter = String(text || "").match(/^---\s*\n([\s\S]*?)\n---/);
  if (frontmatter) {
    const name = frontmatter[1].match(/^name:\s*["']?(.+?)["']?\s*$/im);
    if (name && name[1].trim()) return name[1].trim();
  }

  const heading = String(text || "").match(/^#\s+(.+?)\s*$/m);
  if (heading && heading[1].trim()) {
    return heading[1]
      .replace(/\s+#*$/, "")
      .trim();
  }

  return titleFromRel(rel);
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
  const skillsRoot = path.join(vault, "_CONHECIMENTO", "skills");
  let liveVaultSkills = null;
  let browseSkills = 0;

  if (fs.existsSync(skillsRoot)) {
    liveVaultSkills = 0;
    const walkSkills = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === ".archive") continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkSkills(full);
        } else if (entry.isFile() && entry.name === "SKILL.md") {
          liveVaultSkills += 1;
        }
      }
    };
    walkSkills(skillsRoot);
  }

  if (fs.existsSync(file)) {
    const text = fs.readFileSync(file, "utf8");
    const browse = text.match(/(\d+)\s+do\s+browse\.sh/i);
    if (browse) browseSkills = Number(browse[1]);
    if (liveVaultSkills === null) {
      const total = text.match(/Total:[\s\S]*?\*\*(\d+)\s+skills\*\*/i);
      if (total) return Number(total[1]);
      const vaultOnly = text.match(/Skills do Vault[^\n]*[—-]\s*(\d+)/i);
      return vaultOnly ? Number(vaultOnly[1]) : null;
    }
  }

  return liveVaultSkills === null ? null : liveVaultSkills + browseSkills;
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
      title: titleFromContent(text, item.rel),
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
        title: titleFromContent(fs.readFileSync(item.full, "utf8"), item.rel),
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

function backupAndDelete(vault, rel) {
  const full = safeFile(vault, rel);
  if (!fs.existsSync(full)) throw new Error("Ficheiro nao existe: " + rel);
  const original = fs.readFileSync(full);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(vault, "_BACKUPS", "cerebro-vivo", stamp);
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, rel.replace(/[\\/]/g, "__"));
  fs.writeFileSync(backupPath, original);
  fs.unlinkSync(full);
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

async function gitDiffReport(vault) {
  const steps = [];
  steps.push(await runGit(vault, ["status", "--short"]));
  steps.push(await runGit(vault, ["diff", "--stat"]));
  steps.push(await runGit(vault, ["diff"]));
  const parts = [
    "GIT STATUS",
    steps[0].stdout || "Clean working tree",
    "",
    "GIT DIFF --STAT",
    steps[1].stdout || "No tracked file changes",
    "",
    "GIT DIFF",
    steps[2].stdout || "No tracked diff",
  ];
  return { ok: steps.every((step) => step.ok), steps, report: parts.join("\n") };
}

function resolveLinkInVault(raw, docPath, byNoExt, byBase) {
  const cleaned = normalizeLink(raw);
  const fromDir = path.dirname(docPath).replaceAll("\\", "/");
  const candidates = [];
  if (fromDir && fromDir !== ".") candidates.push(`${fromDir}/${cleaned}`.toLowerCase());
  candidates.push(cleaned.toLowerCase());
  for (const candidate of candidates) {
    if (byNoExt.has(candidate)) return byNoExt.get(candidate);
  }
  const base = path.basename(cleaned).toLowerCase();
  const matches = byBase.get(base) || [];
  return matches.length === 1 ? matches[0] : null;
}

function collectDirectoryNames(root, dir = root, names = new Set()) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    names.add(entry.name.toLowerCase());
    collectDirectoryNames(root, full, names);
  }
  return names;
}

function classifyMissingLink(raw, docPath, vault, byNoExt, byBase, directoryNames) {
  const cleaned = normalizeLink(raw).trim();
  const lower = cleaned.toLowerCase();
  const fromDir = path.dirname(docPath).replaceAll("\\", "/");
  const external = /^[a-z][a-z0-9+.-]*:\/\//i.test(cleaned) || /^mailto:/i.test(cleaned);
  if (external) return "external";

  const placeholderSet = new Set([
    "note name",
    "wikilinks",
    "wikilink",
    "links",
    "source",
    "caminho/skill",
    "path/to/file",
    "filename",
    "ficheiro.md",
    "nome-da-nota",
    "nota-relacionada",
    "nome-do-ficheiro",
    "other-guide",
    "exemplo",
    "example",
    "...",
  ]);
  if (
    placeholderSet.has(lower) ||
    /[<>]/.test(cleaned) ||
    /^\[/.test(cleaned) ||
    /\]$/.test(cleaned) ||
    /^[\w\s'",._-]+,\s*[\w\s'",._-]+$/.test(cleaned) ||
    /\b(example|exemplo|placeholder|todo|your-|teu-|nome-do-|nome-da-|nota-relacionada)\b/i.test(cleaned)
  ) {
    return "placeholder";
  }

  if (/\b(password|tokens?|secrets?|credentials?|credenciais|senha|chave|keys?|api-key|vps|ip)\b/i.test(cleaned)) {
    return "private";
  }

  if (/\.(png|jpe?g|gif|webp|svg|pdf|zip|rar|7z|mp4|mov|mp3|wav)$/i.test(cleaned)) {
    return "asset";
  }

  const candidates = [];
  if (fromDir && fromDir !== ".") candidates.push(path.join(vault, fromDir, cleaned));
  candidates.push(path.join(vault, cleaned));
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) return "directory";
    } catch {
      // Ignore stat failures; the validator should continue reporting the rest.
    }
  }

  if (directoryNames.has(path.basename(cleaned).toLowerCase())) return "directory";

  const base = path.basename(cleaned).toLowerCase();
  const ambiguousMatches = byBase.get(base) || [];
  if (ambiguousMatches.length > 1) return "ambiguous";

  return "actionable";
}

function isExpectedDuplicateName(name, paths) {
  const commonNames = new Set([
    "readme",
    "skill",
    "description",
    "troubleshooting",
    "examples",
    "implementation",
    "errors",
    "details",
    "optimization",
    "advanced-usage",
    "animation",
    "overview",
    "index",
    "_indice",
  ]);
  if (commonNames.has(name)) return true;
  return paths.every((item) => item.replaceAll("\\", "/").toLowerCase().includes("/skills/"));
}

function validateVault(vault) {
  const files = walkMd(vault, vault);
  const byNoExt = new Map();
  const byBase = new Map();
  const docs = [];
  for (const item of files) {
    const text = fs.readFileSync(item.full, "utf8");
    const noExt = item.rel.replace(/\.md$/i, "");
    const base = path.basename(noExt).toLowerCase();
    byNoExt.set(noExt.toLowerCase(), item.rel);
    if (!byBase.has(base)) byBase.set(base, []);
    byBase.get(base).push(item.rel);
    docs.push({ ...item, text, links: extractWikiLinks(text) });
  }

  const broken = {
    actionable: [],
    ambiguous: [],
    asset: [],
    external: [],
    placeholder: [],
    private: [],
    directory: [],
  };
  const directoryNames = collectDirectoryNames(vault);
  for (const doc of docs) {
    for (const link of doc.links) {
      if (!resolveLinkInVault(link, doc.rel, byNoExt, byBase)) {
        const kind = classifyMissingLink(link, doc.rel, vault, byNoExt, byBase, directoryNames);
        broken[kind].push({ file: doc.rel, link });
      }
    }
  }

  const allDuplicates = Array.from(byBase.entries())
    .filter(([, paths]) => paths.length > 1)
    .map(([name, paths]) => ({ name, paths }));
  const duplicateNames = {
    actionable: allDuplicates.filter((item) => !isExpectedDuplicateName(item.name, item.paths)),
    expected: allDuplicates.filter((item) => isExpectedDuplicateName(item.name, item.paths)),
  };

  const malformedFrontmatter = [];
  for (const doc of docs) {
    if (!doc.text.startsWith("---")) continue;
    const end = doc.text.indexOf("\n---", 3);
    if (end === -1) malformedFrontmatter.push(doc.rel);
  }

  const graph = buildGraph(vault);
  const orphans = graph.nodes
    .filter((node) => !node.virtual && Number(node.degree || 0) === 0)
    .map((node) => node.path)
    .sort((a, b) => a.localeCompare(b));

  const limitList = (items, render) => {
    if (!items.length) return "none";
    const visible = items.slice(0, 80).map(render).join("\n");
    return items.length > 80 ? `${visible}\n... ${items.length - 80} more` : visible;
  };

  const noisyLinks =
    broken.ambiguous.length +
    broken.asset.length +
    broken.external.length +
    broken.placeholder.length +
    broken.private.length +
    broken.directory.length;

  const report = [
    "BRAIN VALIDATE",
    `files: ${files.length}`,
    `resolved links: ${graph.stats.links}`,
    `actionable broken links: ${broken.actionable.length}`,
    `expected/noisy unresolved references: ${noisyLinks}`,
    `orphans: ${orphans.length}`,
    `duplicate note names: ${duplicateNames.actionable.length} actionable / ${duplicateNames.expected.length} expected`,
    `malformed frontmatter: ${malformedFrontmatter.length}`,
    "",
    "ACTIONABLE BROKEN LINKS",
    limitList(broken.actionable, (item) => `- ${item.file} -> [[${item.link}]]`),
    "",
    "AMBIGUOUS LINKS (multiple files share that note name)",
    limitList(broken.ambiguous, (item) => `- ${item.file} -> [[${item.link}]]`),
    "",
    "ASSET / ATTACHMENT REFERENCES",
    limitList(broken.asset, (item) => `- ${item.file} -> [[${item.link}]]`),
    "",
    "EXTERNAL URLS WRITTEN AS WIKILINKS",
    limitList(broken.external, (item) => `- ${item.file} -> [[${item.link}]]`),
    "",
    "PLACEHOLDERS / TEMPLATE LINKS",
    limitList(broken.placeholder, (item) => `- ${item.file} -> [[${item.link}]]`),
    "",
    "PRIVATE / LOCAL REFERENCES",
    limitList(broken.private, (item) => `- ${item.file} -> [[${item.link}]]`),
    "",
    "DIRECTORY REFERENCES",
    limitList(broken.directory, (item) => `- ${item.file} -> [[${item.link}]]`),
    "",
    "DUPLICATE NOTE NAMES - ACTIONABLE",
    limitList(duplicateNames.actionable, (item) => `- ${item.name}: ${item.paths.join(" | ")}`),
    "",
    "DUPLICATE NOTE NAMES - EXPECTED PATTERNS",
    limitList(duplicateNames.expected, (item) => `- ${item.name}: ${item.paths.join(" | ")}`),
    "",
    "MALFORMED FRONTMATTER",
    limitList(malformedFrontmatter, (file) => `- ${file}`),
    "",
    "ORPHANS",
    limitList(orphans, (file) => `- ${file}`),
    "",
    "HEALTH NOTES",
    "- Links in ACTIONABLE BROKEN LINKS are the priority fixes.",
    "- External URLs should use normal Markdown links, not [[wikilinks]].",
    "- Placeholder/template links are useful in docs, but they do not represent real vault edges.",
    "- Private/local references may be intentional; do not publish secrets.",
    "- Expected duplicate names are common files such as README.md, SKILL.md and index notes.",
  ].join("\n");

  return {
    ok: true,
    report,
    summary: {
      files: files.length,
      brokenLinks: broken.actionable.length,
      ambiguousLinks: broken.ambiguous.length,
      assetReferences: broken.asset.length,
      externalUrlWikilinks: broken.external.length,
      placeholderLinks: broken.placeholder.length,
      privateReferences: broken.private.length,
      directoryReferences: broken.directory.length,
      noisyLinks,
      orphans: orphans.length,
      duplicateNames: duplicateNames.actionable.length,
      expectedDuplicateNames: duplicateNames.expected.length,
      malformedFrontmatter: malformedFrontmatter.length,
    },
  };
}

function backupRoot(vault) {
  return path.join(vault, "_BACKUPS", "cerebro-vivo-full");
}

function backupRel(vault, full) {
  return path.relative(vault, full).replaceAll(path.sep, "/");
}

function safeBackupDir(vault, id) {
  const root = backupRoot(vault);
  const full = path.resolve(root, String(id || ""));
  const relative = path.relative(root, full);
  if (!id || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Backup path blocked");
  }
  if (!fs.existsSync(full) || !fs.statSync(full).isDirectory()) {
    throw new Error("Backup not found");
  }
  return full;
}

function copyVaultForBackup(source, target, counts = { files: 0, bytes: 0 }) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.isDirectory() && IGNORE_DIRS.has(entry.name)) continue;
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyVaultForBackup(from, to, counts);
      continue;
    }
    if (!entry.isFile()) continue;
    fs.copyFileSync(from, to);
    const size = fs.statSync(to).size;
    counts.files += 1;
    counts.bytes += size;
  }
  return counts;
}

function listBackups(vault) {
  const root = backupRoot(vault);
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const full = path.join(root, entry.name);
      const size = vaultContentSize(full);
      return {
        id: entry.name,
        path: backupRel(vault, full),
        created: fs.statSync(full).birthtimeMs || fs.statSync(full).mtimeMs,
        files: size.files,
        bytes: size.bytes,
      };
    })
    .sort((a, b) => b.created - a.created);
}

function createFullBackup(vault) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = path.join(backupRoot(vault), stamp);
  const counts = copyVaultForBackup(vault, dest);
  return {
    id: stamp,
    path: backupRel(vault, dest),
    files: counts.files,
    bytes: counts.bytes,
  };
}

function openFolder(folder) {
  const commands = process.platform === "win32"
    ? ["explorer", [folder]]
    : process.platform === "darwin"
      ? ["open", [folder]]
      : ["xdg-open", [folder]];
  const child = execFile(commands[0], commands[1], { detached: true, stdio: "ignore" });
  child.unref();
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

function vaultContentSize(vault) {
  const cached = vaultSizeCache.get(vault);
  const now = Date.now();
  if (cached && now - cached.time < 60000) return cached.value;

  let total = 0;
  let files = 0;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (IGNORE_DIRS.has(entry.name)) continue;
        walk(path.join(dir, entry.name));
        continue;
      }
      if (!entry.isFile()) continue;
      try {
        total += fs.statSync(path.join(dir, entry.name)).size;
        files += 1;
      } catch {
        // File changed while measuring; skip it in this pass.
      }
    }
  };

  walk(vault);
  const value = { bytes: total, files };
  vaultSizeCache.set(vault, { time: now, value });
  return value;
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
  const vaultSize = vaultContentSize(vault);
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
    vaultSize,
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
      const graph = buildGraph(vault);
      logEvent(vault, "graph:index", {
        message: "Indexed graph",
        files: graph.stats.files,
        links: graph.stats.links,
        folders: graph.stats.folders,
      }, req);
      return json(res, 200, graph);
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
      const stat = fs.statSync(full);
      logEvent(vault, "file:open", { file: rel, bytes: stat.size }, req);
      return json(res, 200, {
        ok: true,
        path: rel,
        content: fs.readFileSync(full, "utf8"),
        modified: stat.mtimeMs,
      });
    }

    if (url.pathname === "/api/save" && req.method === "POST") {
      const payload = JSON.parse(await readBody(req));
      const vault = safeVault(payload.vault);
      const content = String(payload.content ?? "");
      const backup = backupAndSave(vault, payload.file, content);
      logEvent(vault, "file:save", { file: payload.file, backup, bytes: Buffer.byteLength(content, "utf8") }, req);
      return json(res, 200, { ok: true, backup });
    }

    if (url.pathname === "/api/delete" && req.method === "POST") {
      const payload = JSON.parse(await readBody(req));
      const vault = safeVault(payload.vault);
      const backup = backupAndDelete(vault, payload.file);
      removeFavorite(vault, payload.file);
      logEvent(vault, "file:delete", { file: payload.file, backup }, req);
      return json(res, 200, { ok: true, backup });
    }

    if (url.pathname === "/api/new-note" && req.method === "POST") {
      const payload = JSON.parse(await readBody(req));
      const vault = safeVault(payload.vault);
      const note = createNewNote(vault, payload.folder, payload.title, payload.contextLinks);
      logEvent(vault, "file:create", { file: note.rel, bytes: Buffer.byteLength(note.content, "utf8") }, req);
      return json(res, 200, { ok: true, path: note.rel, content: note.content });
    }

    if (url.pathname === "/api/logs") {
      return json(res, 200, { ok: true, logs: readLogs(Number(url.searchParams.get("limit") || 200)) });
    }

    if (url.pathname === "/api/logs/clear" && req.method === "POST") {
      clearLogs();
      logEvent(null, "logs:clear", { message: "Cleared local logs" }, req);
      return json(res, 200, { ok: true });
    }

    if (url.pathname === "/api/favorites") {
      const vault = safeVault(url.searchParams.get("vault"));
      return json(res, 200, { ok: true, favorites: favoritesForVault(vault) });
    }

    if (url.pathname === "/api/browse") {
      const vault = safeVault(url.searchParams.get("vault"));
      return json(res, 200, browseFolder(vault, url.searchParams.get("dir") || ""));
    }

    if (url.pathname === "/api/favorite" && req.method === "POST") {
      const payload = JSON.parse(await readBody(req));
      const vault = safeVault(payload.vault);
      const favorites = setFavorite(vault, payload.file, !!payload.favorite);
      logEvent(vault, payload.favorite ? "favorite:add" : "favorite:remove", { file: payload.file }, req);
      return json(res, 200, { ok: true, favorites });
    }

    if (url.pathname === "/api/stats") {
      const vault = safeVault(url.searchParams.get("vault"));
      return json(res, 200, await machineStats(vault));
    }

    if (url.pathname === "/api/sync" && req.method === "POST") {
      const payload = JSON.parse(await readBody(req));
      const vault = safeVault(payload.vault);
      logEvent(vault, "git:sync:start", { message: "Manual sync started" }, req);
      const steps = await syncVault(vault);
      const ok = steps.every((step) => step.ok);
      logEvent(vault, ok ? "git:sync:done" : "git:sync:error", {
        message: ok ? "Manual sync finished" : "Manual sync failed",
        steps,
      }, req);
      return json(res, 200, { ok, steps });
    }

    if (url.pathname === "/api/git-diff" && req.method === "POST") {
      const payload = JSON.parse(await readBody(req));
      const vault = safeVault(payload.vault);
      const result = await gitDiffReport(vault);
      logEvent(vault, "git:diff", {
        message: "Git diff generated",
        steps: result.steps,
      }, req);
      return json(res, 200, result);
    }

    if (url.pathname === "/api/validate" && req.method === "POST") {
      const payload = JSON.parse(await readBody(req));
      const vault = safeVault(payload.vault);
      const result = validateVault(vault);
      logEvent(vault, "brain:validate", {
        message: "Brain validation generated",
        ...result.summary,
      }, req);
      return json(res, 200, result);
    }

    if (url.pathname === "/api/open-folder" && req.method === "POST") {
      const payload = JSON.parse(await readBody(req));
      const vault = safeVault(payload.vault);
      openFolder(vault);
      logEvent(vault, "folder:open", { message: "Brain folder opened in file manager" }, req);
      return json(res, 200, { ok: true, report: "Brain folder opened in the system file manager." });
    }

    if (url.pathname === "/api/backups") {
      const vault = safeVault(url.searchParams.get("vault"));
      const backups = listBackups(vault);
      return json(res, 200, { ok: true, backups });
    }

    if (url.pathname === "/api/backups/create" && req.method === "POST") {
      const payload = JSON.parse(await readBody(req));
      const vault = safeVault(payload.vault);
      const backup = createFullBackup(vault);
      logEvent(vault, "backup:create", {
        message: `Backup created: ${backup.path}`,
        file: backup.path,
        files: backup.files,
        bytes: backup.bytes,
      }, req);
      return json(res, 200, { ok: true, backup, backups: listBackups(vault) });
    }

    if (url.pathname === "/api/backups/delete" && req.method === "POST") {
      const payload = JSON.parse(await readBody(req));
      const vault = safeVault(payload.vault);
      const backupDir = safeBackupDir(vault, payload.id);
      const rel = backupRel(vault, backupDir);
      fs.rmSync(backupDir, { recursive: true, force: true });
      logEvent(vault, "backup:delete", { message: `Backup deleted: ${rel}`, file: rel }, req);
      return json(res, 200, { ok: true, backups: listBackups(vault) });
    }

    if (url.pathname === "/api/backups/open" && req.method === "POST") {
      const payload = JSON.parse(await readBody(req));
      const vault = safeVault(payload.vault);
      const backupDir = safeBackupDir(vault, payload.id);
      const rel = backupRel(vault, backupDir);
      openFolder(backupDir);
      logEvent(vault, "backup:open", { message: `Backup folder opened: ${rel}`, file: rel }, req);
      return json(res, 200, { ok: true, report: "Backup folder opened in the system file manager." });
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
