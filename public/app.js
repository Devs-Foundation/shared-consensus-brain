const canvas = document.querySelector("#graphCanvas");
const ctx = canvas.getContext("2d");

const SETTINGS_VERSION = 5;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

const state = {
  vault: "",
  graph: { nodes: [], links: [], folders: [], stats: {} },
  nodes: [],
  links: [],
  selected: null,
  hover: null,
  downNode: null,
  moved: false,
  fileContent: "",
  mode: "read",
  camera: { x: 0, y: 0, zoom: 1 },
  dragging: null,
  panning: false,
  lastMouse: { x: 0, y: 0 },
  lastIndexAt: Date.now(),
  options: {
    labels: false,
    bg: "#050806",
    node: "#f5f5f5",
    link: "#7d8a82",
    motion: 0.48,
    size: 0.35,
    folder: "",
    search: "",
  },
};

const el = {
  vaultPath: document.querySelector("#vaultPath"),
  loadBtn: document.querySelector("#loadBtn"),
  search: document.querySelector("#searchInput"),
  folder: document.querySelector("#folderFilter"),
  labels: document.querySelector("#showLabels"),
  bg: document.querySelector("#bgColor"),
  node: document.querySelector("#nodeColor"),
  link: document.querySelector("#linkColor"),
  motion: document.querySelector("#motionRange"),
  size: document.querySelector("#sizeRange"),
  fileCount: document.querySelector("#fileCount"),
  linkCount: document.querySelector("#linkCount"),
  folderCount: document.querySelector("#folderCount"),
  skillCount: document.querySelector("#skillCount"),
  modelCount: document.querySelector("#modelCount"),
  orphanCount: document.querySelector("#orphanCount"),
  wordCount: document.querySelector("#wordCount"),
  messageCount: document.querySelector("#messageCount"),
  brainAgeCount: document.querySelector("#brainAgeCount"),
  status: document.querySelector("#status"),
  fileTitle: document.querySelector("#fileTitle"),
  filePath: document.querySelector("#filePath"),
  preview: document.querySelector("#preview"),
  editor: document.querySelector("#editor"),
  readTab: document.querySelector("#readTab"),
  editTab: document.querySelector("#editTab"),
  saveBtn: document.querySelector("#saveBtn"),
  backBtn: document.querySelector("#backBtn"),
  saveStatus: document.querySelector("#saveStatus"),
  searchResults: document.querySelector("#searchResults"),
  changeBox: document.querySelector("#changeBox"),
  reloadGraphBtn: document.querySelector("#reloadGraphBtn"),
  toggleReaderBtn: document.querySelector("#toggleReaderBtn"),
  dashboardToggleBtn: document.querySelector("#dashboardToggleBtn"),
  saveGraphBtn: document.querySelector("#saveGraphBtn"),
  syncBtn: document.querySelector("#syncBtn"),
  logsBtn: document.querySelector("#logsBtn"),
  logsDialog: document.querySelector("#logsDialog"),
  closeLogsBtn: document.querySelector("#closeLogsBtn"),
  clearLogsBtn: document.querySelector("#clearLogsBtn"),
  logsOutput: document.querySelector("#logsOutput"),
  machineName: document.querySelector("#machineName"),
  machineCpu: document.querySelector("#machineCpu"),
  machineCpuLoad: document.querySelector("#machineCpuLoad"),
  machineRam: document.querySelector("#machineRam"),
  machineDisk: document.querySelector("#machineDisk"),
  machineGrowth: document.querySelector("#machineGrowth"),
};

function setStatus(text) {
  el.status.textContent = text;
}

function cssVar(name, value) {
  document.documentElement.style.setProperty(name, value);
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const value = parseInt(clean, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgba(hex, alpha) {
  const c = hexToRgb(hex);
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (state.nodes.length) fitGraphToView({ focusCore: true });
}

let resizeTimer = null;
function scheduleResize() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(resize, 80);
}

function screenToWorld(x, y) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (x - rect.width / 2 - state.camera.x) / state.camera.zoom,
    y: (y - rect.height / 2 - state.camera.y) / state.camera.zoom,
  };
}

function worldToScreen(x, y) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: rect.width / 2 + state.camera.x + x * state.camera.zoom,
    y: rect.height / 2 + state.camera.y + y * state.camera.zoom,
  };
}

async function api(path) {
  const res = await fetch(path);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Erro");
  return data;
}

async function init() {
  try {
    state.vault = localStorage.getItem("cerebro-vivo-vault") || "";
    el.vaultPath.value = state.vault;
    restoreTheme();
    bindUi();
    resize();
    if (state.vault) {
      await loadGraph({ keepCurrent: true });
    } else {
      setStatus("Choose a local brain folder to start.");
      revealVaultPath();
    }
    requestAnimationFrame(loop);
  } catch (err) {
    setStatus(err.message);
  }
}

function restoreTheme() {
  const saved = JSON.parse(localStorage.getItem("cerebro-vivo-theme") || "{}");
  if (saved.version === SETTINGS_VERSION) {
    Object.assign(state.options, saved);
  } else {
    state.options.bg = saved.bg ?? state.options.bg;
    state.options.node = saved.node ?? state.options.node;
    state.options.link = saved.link ?? state.options.link;
    state.options.motion = saved.motion ?? state.options.motion;
  }
  state.options.labels = saved.version === SETTINGS_VERSION ? saved.labels ?? false : false;
  state.options.size = saved.version === SETTINGS_VERSION ? saved.size ?? 0.35 : 0.35;
  state.options.motion = Math.max(state.options.motion, 0.42);
  el.labels.checked = state.options.labels;
  el.bg.value = state.options.bg;
  el.node.value = state.options.node;
  el.link.value = state.options.link;
  el.motion.value = Math.round(state.options.motion * 100);
  el.size.value = Math.round(state.options.size * 100);
  applyTheme();
}

function saveTheme() {
  localStorage.setItem("cerebro-vivo-theme", JSON.stringify({
    version: SETTINGS_VERSION,
    labels: state.options.labels,
    bg: state.options.bg,
    node: state.options.node,
    link: state.options.link,
    motion: state.options.motion,
    size: state.options.size,
  }));
}

function applyTheme() {
  cssVar("--bg", state.options.bg);
  cssVar("--accent", state.options.link);
  saveTheme();
}

function compactNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "n/a";
  const number = Number(value);
  if (Math.abs(number) >= 1000000000) return `${(number / 1000000000).toFixed(1)}B`;
  if (Math.abs(number) >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
  if (Math.abs(number) >= 10000) return `${(number / 1000).toFixed(1)}K`;
  return String(number);
}

function bindUi() {
  window.addEventListener("resize", resize);
  if (window.ResizeObserver) {
    const observer = new ResizeObserver(scheduleResize);
    observer.observe(canvas.parentElement);
  }
  el.loadBtn.addEventListener("click", () => {
    if (document.body.classList.contains("vault-locked")) revealVaultPath();
    else loadGraph();
  });
  el.reloadGraphBtn.addEventListener("click", () => loadGraph({ keepCurrent: true }));
  el.toggleReaderBtn.addEventListener("click", toggleReader);
  el.dashboardToggleBtn.addEventListener("click", toggleDashboard);
  el.saveGraphBtn.addEventListener("click", () => exportSnapshot({ metrics: true, copy: false }));
  el.syncBtn.addEventListener("click", syncBrain);
  el.logsBtn.addEventListener("click", openLogs);
  el.closeLogsBtn.addEventListener("click", () => el.logsDialog.close());
  el.clearLogsBtn.addEventListener("click", clearLogs);
  el.search.addEventListener("input", () => {
    state.options.search = el.search.value.trim().toLowerCase();
    applyFilters();
  });
  el.search.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const first = state.nodes.find((node) => node.visible);
    if (first) {
      focusNode(first);
      selectNode(first);
    }
  });
  el.folder.addEventListener("change", () => {
    state.options.folder = el.folder.value;
    applyFilters();
    fitGraphToView({ focusCore: true });
  });
  el.labels.addEventListener("change", () => {
    state.options.labels = el.labels.checked;
    saveTheme();
  });
  el.bg.addEventListener("input", () => { state.options.bg = el.bg.value; applyTheme(); });
  el.node.addEventListener("input", () => { state.options.node = el.node.value; saveTheme(); });
  el.link.addEventListener("input", () => { state.options.link = el.link.value; saveTheme(); });
  el.motion.addEventListener("input", () => { state.options.motion = Number(el.motion.value) / 100; saveTheme(); });
  el.size.addEventListener("input", () => { state.options.size = Number(el.size.value) / 100; saveTheme(); });
  el.readTab.addEventListener("click", () => setMode("read"));
  el.editTab.addEventListener("click", () => setMode("edit"));
  el.saveBtn.addEventListener("click", saveFile);
  el.backBtn.addEventListener("click", () => {
    state.selected = null;
    el.fileTitle.textContent = "Nothing selected";
    el.filePath.textContent = "Choose a node in the graph";
    el.preview.innerHTML = "";
    el.editor.value = "";
    el.editTab.disabled = false;
    el.saveBtn.disabled = false;
    setMode("read");
    closeReader();
  });

  canvas.addEventListener("mousedown", onMouseDown);
  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("mouseup", onMouseUp);
  canvas.addEventListener("mouseleave", onMouseUp);
  canvas.addEventListener("click", onClick);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("dblclick", () => fitGraphToView({ focusCore: true }));
  setInterval(checkChanges, 120000);
  setInterval(loadMachineStats, 5000);
  closeReader();
}

function lockVaultPath() {
  document.body.classList.add("vault-locked");
  el.vaultPath.readOnly = true;
  el.vaultPath.value = "BRAIN LOADED";
  el.loadBtn.textContent = "Change folder";
}

function revealVaultPath() {
  document.body.classList.remove("vault-locked");
  el.vaultPath.readOnly = false;
  el.vaultPath.value = state.vault;
  el.loadBtn.textContent = "Load brain";
  el.vaultPath.focus();
  el.vaultPath.select();
}

async function loadGraph(options = {}) {
  if (!options.keepCurrent) state.vault = el.vaultPath.value.trim();
  if (!state.vault) {
    setStatus("Choose a local brain folder to start.");
    revealVaultPath();
    return;
  }
  setStatus("Indexing Markdown...");
  const data = await api(`/api/graph?vault=${encodeURIComponent(state.vault)}`);
  localStorage.setItem("cerebro-vivo-vault", state.vault);
  state.graph = data;
  state.lastIndexAt = Date.now();
  el.fileCount.textContent = data.stats.files;
  el.linkCount.textContent = data.stats.links;
  el.folderCount.textContent = data.stats.folders;
  el.skillCount.textContent = data.stats.skills ?? "n/a";
  el.modelCount.textContent = data.stats.contributors ?? "n/a";
  el.orphanCount.textContent = compactNumber(data.stats.orphans);
  el.wordCount.textContent = compactNumber(data.stats.totalWords);
  el.messageCount.textContent = compactNumber(data.stats.messages);
  el.brainAgeCount.textContent = compactNumber(data.stats.brainAgeDays);
  fillFolders(data.folders);
  prepareGraph(data);
  applyFilters();
  fitGraphToView({ focusCore: true });
  requestAnimationFrame(() => fitGraphToView({ focusCore: true }));
  updateChangeBox([]);
  loadMachineStats();
  lockVaultPath();
  setStatus(`${data.stats.files} files, ${data.stats.links} links`);
}

function fillFolders(folders) {
  el.folder.innerHTML = `<option value="">All</option>`;
  for (const folder of folders) {
    const option = document.createElement("option");
    option.value = folder;
    option.textContent = folder;
    el.folder.appendChild(option);
  }
}

function prepareGraph(graph) {
  const byId = new Map();
  const folders = new Map(graph.folders.map((f, i) => [f, i]));
  const folderSeen = new Map();
  const ranked = [...graph.nodes].sort((a, b) => b.degree - a.degree);
  const hubIds = new Set(ranked.filter((node) => node.degree >= 8).slice(0, 42).map((node) => node.id));
  let hubIndex = 0;
  let orphanIndex = 0;

  state.nodes = graph.nodes.map((node, i) => {
    const folderIndex = folders.get(node.folder) || 0;
    const folderCount = Math.max(1, graph.folders.length);
    const localIndex = folderSeen.get(node.folder) || 0;
    folderSeen.set(node.folder, localIndex + 1);
    const folderAngle = (folderIndex / folderCount) * Math.PI * 2;
    const localAngle = localIndex * GOLDEN_ANGLE + folderIndex * 0.43;
    let x;
    let y;
    let kind = "linked";

    if (node.degree === 0) {
      const angle = orphanIndex * GOLDEN_ANGLE;
      const ring = 2700 + (orphanIndex % 9) * 26;
      x = Math.cos(angle) * ring * 1.12;
      y = Math.sin(angle) * ring * 0.82;
      orphanIndex += 1;
      kind = "orphan";
    } else if (hubIds.has(node.id)) {
      const angle = hubIndex * GOLDEN_ANGLE;
      const ring = 80 + Math.sqrt(hubIndex + 1) * 58;
      x = Math.cos(angle) * ring;
      y = Math.sin(angle) * ring * 0.78;
      hubIndex += 1;
      kind = "hub";
    } else {
      const orbit = 220 + Math.sqrt(localIndex + 1) * 46;
      const clusterX = Math.cos(folderAngle) * (1180 + (folderIndex % 4) * 150);
      const clusterY = Math.sin(folderAngle) * (860 + (folderIndex % 3) * 120);
      const hubPull = Math.max(0, Math.min(1, node.degree / 24));
      x = clusterX * (1 - hubPull * 0.34) + Math.cos(localAngle) * orbit * 0.92;
      y = clusterY * (1 - hubPull * 0.34) + Math.sin(localAngle) * orbit * 0.72;
    }

    const item = {
      ...node,
      x,
      y,
      homeX: x,
      homeY: y,
      kind,
      vx: 0,
      vy: 0,
      visible: true,
      phase: Math.random() * Math.PI * 2,
      searchText: node.searchText || `${node.title} ${node.folder} ${node.path}`.toLowerCase(),
      radius: 1 + Math.min(13, Math.sqrt(node.degree + 1) * (kind === "hub" ? 1.25 : 0.82)),
    };
    byId.set(item.id, item);
    return item;
  });

  state.links = graph.links
    .map((link) => ({ source: byId.get(link.source), target: byId.get(link.target) }))
    .filter((link) => link.source && link.target);

  fitGraphToView({ focusCore: true });
}

function fitGraphToView(options = {}) {
  const rect = canvas.getBoundingClientRect();
  const visible = state.nodes.filter((node) => node.visible);
  if (!visible.length || !rect.width || !rect.height) {
    state.camera = { x: 0, y: 0, zoom: 0.18 };
    return;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const framed = options.focusCore
    ? visible.filter((node) => node.degree > 0 && node.kind !== "orphan")
    : visible;
  const nodesToFrame = framed.length > 12 ? framed : visible;

  for (const node of nodesToFrame) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x);
    maxY = Math.max(maxY, node.y);
  }

  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const zoom = Math.min(rect.width / (width * 1.08), rect.height / (height * 1.08), 0.34);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const horizontalNudge = -rect.width * 0.24;
  const verticalNudge = -42;
  state.camera = { x: -cx * zoom + horizontalNudge, y: -cy * zoom + verticalNudge, zoom };
}

function applyFilters() {
  const q = state.options.search;
  const folder = state.options.folder;
  for (const node of state.nodes) {
    const hay = node.searchText;
    node.visible = (!folder || node.folder === folder) && (!q || hay.includes(q));
  }
  renderSearchResults();
}

function renderSearchResults() {
  const q = state.options.search;
  if (!q) {
    el.searchResults.classList.remove("active");
    el.searchResults.innerHTML = "";
    return;
  }

  const results = state.nodes
    .filter((node) => node.visible)
    .sort((a, b) => {
      const at = a.title.toLowerCase().includes(q) ? 0 : 1;
      const bt = b.title.toLowerCase().includes(q) ? 0 : 1;
      return at - bt || b.degree - a.degree || a.title.localeCompare(b.title);
    })
    .slice(0, 30);

  el.searchResults.classList.add("active");
  el.searchResults.innerHTML = "";
  if (!results.length) {
    const empty = document.createElement("div");
    empty.className = "hint";
    empty.textContent = "No results.";
    el.searchResults.appendChild(empty);
    return;
  }

  for (const node of results) {
    const btn = document.createElement("button");
    btn.className = "result-item";
    btn.innerHTML = `<strong>${escapeHtml(node.title)}</strong><small>${escapeHtml(node.path)}</small>`;
    btn.addEventListener("click", () => {
      focusNode(node);
      selectNode(node);
    });
    el.searchResults.appendChild(btn);
  }
}

function focusNode(node) {
  state.camera.x = -node.x * state.camera.zoom;
  state.camera.y = -node.y * state.camera.zoom;
  node.vx = 0;
  node.vy = 0;
}

async function checkChanges() {
  if (!state.vault) return;
  try {
    const data = await api(`/api/changes?vault=${encodeURIComponent(state.vault)}&since=${state.lastIndexAt}`);
    updateChangeBox(data.changed);
  } catch {
    // The monitor must never interrupt the viewer.
  }
}

function updateChangeBox(changed) {
  el.changeBox.classList.toggle("hot", changed.length > 0);
  const text = el.changeBox.querySelector("strong");
  const sub = el.changeBox.querySelector("small");
  if (!changed.length) {
    text.textContent = "No new changes";
    sub.textContent = "local brain monitor";
    return;
  }
  text.textContent = `${changed.length} brain change${changed.length === 1 ? "" : "s"}`;
  sub.textContent = changed.slice(0, 3).map((item) => item.title).join(" · ");
}

function tick() {
  const motion = Math.min(state.options.motion, 4.5);
  if (motion <= 0.01) return;
  const visible = state.nodes.filter((n) => n.visible);
  const centerForce = 0.000045 * motion;
  const homeForce = 0.00022 * motion;
  const linkForce = 0.0028 * motion;
  const repel = 175 * motion;

  for (const link of state.links) {
    if (!link.source.visible || !link.target.visible) continue;
    const dx = link.target.x - link.source.x;
    const dy = link.target.y - link.source.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ideal = 250 + Math.min(260, (link.source.radius + link.target.radius) * 22);
    const f = (dist - ideal) * linkForce;
    const fx = (dx / dist) * f;
    const fy = (dy / dist) * f;
    link.source.vx += fx;
    link.source.vy += fy;
    link.target.vx -= fx;
    link.target.vy -= fy;
  }

  for (let i = 0; i < visible.length; i++) {
    const a = visible[i];
    for (let j = i + 1; j < Math.min(visible.length, i + 92); j++) {
      const b = visible[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist2 = dx * dx + dy * dy + 0.01;
      if (dist2 > 220000) continue;
      const dist = Math.sqrt(dist2);
      const f = repel / dist2;
      const fx = (dx / dist) * f;
      const fy = (dy / dist) * f;
      a.vx -= fx;
      a.vy -= fy;
      b.vx += fx;
      b.vy += fy;
    }
  }

  for (const node of visible) {
    const home = node.kind === "orphan" ? homeForce * 1.8 : homeForce;
    const center = node.kind === "orphan" ? 0 : centerForce;
    node.vx += (node.homeX - node.x) * home;
    node.vy += (node.homeY - node.y) * home;
    node.vx += -node.x * center;
    node.vy += -node.y * center;
    node.vx *= node.kind === "hub" ? 0.9 : 0.87;
    node.vy *= node.kind === "hub" ? 0.9 : 0.87;
    const maxSpeed = 12 + motion * 14;
    const speed = Math.hypot(node.vx, node.vy);
    if (speed > maxSpeed) {
      node.vx = (node.vx / speed) * maxSpeed;
      node.vy = (node.vy / speed) * maxSpeed;
    }
    node.x += node.vx;
    node.y += node.vy;
  }
}

function drawGraph(rect) {
  const time = performance.now() / 1000;
  ctx.save();
  ctx.translate(rect.width / 2 + state.camera.x, rect.height / 2 + state.camera.y);
  ctx.scale(state.camera.zoom, state.camera.zoom);

  ctx.lineWidth = 1 / state.camera.zoom;
  for (const link of state.links) {
    if (!link.source.visible || !link.target.visible) continue;
    ctx.strokeStyle = rgba(state.options.link, 0.28);
    const visualMotion = Math.min(state.options.motion, 4.5);
    const sway = 3.8 * visualMotion;
    const sx = link.source.x + Math.sin(time * (0.65 + visualMotion * 0.16) + link.source.phase) * sway;
    const sy = link.source.y + Math.cos(time * (0.58 + visualMotion * 0.14) + link.source.phase) * sway;
    const tx = link.target.x + Math.sin(time * (0.65 + visualMotion * 0.16) + link.target.phase) * sway;
    const ty = link.target.y + Math.cos(time * (0.58 + visualMotion * 0.14) + link.target.phase) * sway;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
  }

  for (const node of state.nodes) {
    if (!node.visible) continue;
    const visualMotion = Math.min(state.options.motion, 4.5);
    const sway = 4.6 * visualMotion;
    const drawX = node.x + Math.sin(time * (0.65 + visualMotion * 0.16) + node.phase) * sway;
    const drawY = node.y + Math.cos(time * (0.58 + visualMotion * 0.14) + node.phase) * sway;
    const selected = state.selected && state.selected.id === node.id;
    const r = node.radius * state.options.size * (selected ? 1.7 : 1);
    ctx.fillStyle = selected ? "#ffffff" : rgba(state.options.node, 0.82);
    ctx.shadowColor = selected ? state.options.link : "transparent";
    ctx.shadowBlur = selected ? 25 / state.camera.zoom : 0;
    ctx.beginPath();
    ctx.arc(drawX, drawY, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    const showLabel =
      selected ||
      node === state.hover ||
      (state.camera.zoom > 0.9 && node.degree > 0) ||
      (state.camera.zoom > 0.55 && node.degree > 5) ||
      (state.camera.zoom > 0.34 && node.degree > 14);

    if (state.options.labels && showLabel) {
      const labelSize = Math.max(11 / state.camera.zoom, 6.8);
      ctx.font = `700 ${labelSize}px Segoe UI, Arial`;
      ctx.fillStyle = selected ? "#ffffff" : "rgba(255,255,255,0.82)";
      ctx.textAlign = "center";
      ctx.fillText(node.title.slice(0, 30), drawX, drawY + r + 13 / state.camera.zoom);
    }
  }
  ctx.restore();
}

function snapshotMetrics() {
  return [
    ["Files", el.fileCount.textContent],
    ["Links", el.linkCount.textContent],
    ["Folders", el.folderCount.textContent],
    ["Skills", el.skillCount.textContent],
    ["Contributors", el.modelCount.textContent],
    ["Orphans", el.orphanCount.textContent],
    ["Words", el.wordCount.textContent],
    ["Messages", el.messageCount.textContent],
    ["Brain days", el.brainAgeCount.textContent],
    ["Brain size", el.machineDisk.textContent],
  ].filter(([, value]) => value && value !== "...");
}

function drawWatermark(targetCtx, width, height, includeMetrics) {
  const scale = Math.max(1, Math.min(width, height) / 900);
  const pad = 24 * scale;
  const badge = 46 * scale;
  const line = 22 * scale;
  const metrics = includeMetrics ? snapshotMetrics() : [];
  const panelWidth = includeMetrics ? 430 * scale : 355 * scale;
  const panelHeight = includeMetrics ? (122 + Math.ceil(metrics.length / 2) * 25) * scale : 84 * scale;
  const x = width - panelWidth - pad;
  const y = height - panelHeight - pad;

  targetCtx.save();
  targetCtx.fillStyle = "rgba(0, 0, 0, 0.68)";
  targetCtx.strokeStyle = "rgba(40, 215, 255, 0.42)";
  targetCtx.lineWidth = Math.max(1, 1.4 * scale);
  roundRect(targetCtx, x, y, panelWidth, panelHeight, 14 * scale);
  targetCtx.fill();
  targetCtx.stroke();

  const cx = x + pad + badge / 2;
  const cy = y + pad + badge / 2;
  targetCtx.strokeStyle = "rgba(255,255,255,0.88)";
  targetCtx.lineWidth = 2 * scale;
  targetCtx.beginPath();
  targetCtx.arc(cx, cy, badge / 2, 0, Math.PI * 2);
  targetCtx.stroke();
  targetCtx.beginPath();
  targetCtx.arc(cx, cy, badge / 2 - 7 * scale, 0, Math.PI * 2);
  targetCtx.stroke();
  targetCtx.fillStyle = "rgba(255,255,255,0.94)";
  targetCtx.font = `800 ${16 * scale}px Segoe UI, Arial`;
  targetCtx.textAlign = "center";
  targetCtx.textBaseline = "middle";
  targetCtx.fillText("DF", cx, cy);

  targetCtx.textAlign = "left";
  targetCtx.textBaseline = "alphabetic";
  targetCtx.fillStyle = "#ffffff";
  targetCtx.font = `800 ${20 * scale}px Segoe UI, Arial`;
  targetCtx.fillText("Shared Consensus Brain", x + pad + badge + 13 * scale, y + pad + 20 * scale);
  targetCtx.fillStyle = "rgba(255,255,255,0.68)";
  targetCtx.font = `500 ${13 * scale}px Segoe UI, Arial`;
  targetCtx.fillText("Dev's Foundation · local vault snapshot", x + pad + badge + 13 * scale, y + pad + 42 * scale);

  if (includeMetrics) {
    targetCtx.strokeStyle = "rgba(255,255,255,0.14)";
    targetCtx.beginPath();
    targetCtx.moveTo(x + pad, y + 88 * scale);
    targetCtx.lineTo(x + panelWidth - pad, y + 88 * scale);
    targetCtx.stroke();

    const leftX = x + pad;
    const rightX = x + panelWidth / 2 + 8 * scale;
    let rowY = y + 114 * scale;
    targetCtx.font = `700 ${14 * scale}px Segoe UI, Arial`;
    for (let i = 0; i < metrics.length; i += 2) {
      drawMetric(targetCtx, leftX, rowY, metrics[i], scale);
      if (metrics[i + 1]) drawMetric(targetCtx, rightX, rowY, metrics[i + 1], scale);
      rowY += line;
    }
  }
  targetCtx.restore();
}

function drawMetric(targetCtx, x, y, metric, scale) {
  targetCtx.fillStyle = "rgba(255,255,255,0.58)";
  targetCtx.font = `600 ${12 * scale}px Segoe UI, Arial`;
  targetCtx.fillText(metric[0], x, y);
  targetCtx.fillStyle = "#ffffff";
  targetCtx.font = `800 ${15 * scale}px Segoe UI, Arial`;
  targetCtx.fillText(metric[1], x + 95 * scale, y);
}

function roundRect(targetCtx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  targetCtx.beginPath();
  targetCtx.moveTo(x + r, y);
  targetCtx.arcTo(x + width, y, x + width, y + height, r);
  targetCtx.arcTo(x + width, y + height, x, y + height, r);
  targetCtx.arcTo(x, y + height, x, y, r);
  targetCtx.arcTo(x, y, x + width, y, r);
  targetCtx.closePath();
}

async function exportSnapshot({ metrics, copy }) {
  const out = document.createElement("canvas");
  out.width = canvas.width;
  out.height = canvas.height;
  const outCtx = out.getContext("2d");
  outCtx.fillStyle = state.options.bg || "#050806";
  outCtx.fillRect(0, 0, out.width, out.height);
  outCtx.drawImage(canvas, 0, 0);
  drawWatermark(outCtx, out.width, out.height, metrics);

  const blob = await new Promise((resolve) => out.toBlob(resolve, "image/png", 0.95));
  if (!blob) {
    setStatus("Snapshot export failed");
    return;
  }

  if (copy && navigator.clipboard && window.ClipboardItem) {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setStatus("Branded snapshot copied");
      return;
    } catch {
      setStatus("Clipboard unavailable. Downloading branded snapshot instead.");
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  a.href = url;
  a.download = metrics ? `shared-consensus-brain-${stamp}.png` : `shared-consensus-brain-clean-${stamp}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setStatus(metrics ? "Branded snapshot saved" : "Clean snapshot saved");
}

function openReader() {
  document.body.classList.remove("reader-closed");
  el.toggleReaderBtn.textContent = "Close reader";
  scheduleResize();
}

function closeReader() {
  document.body.classList.add("reader-closed");
  el.toggleReaderBtn.textContent = "Open reader";
  scheduleResize();
}

function toggleReader() {
  if (document.body.classList.contains("reader-closed")) openReader();
  else closeReader();
}

function toggleDashboard() {
  const collapsed = document.body.classList.toggle("dashboard-collapsed");
  el.dashboardToggleBtn.textContent = collapsed ? "Show dashboard" : "Hide dashboard";
  scheduleResize();
}

function loop() {
  tick();
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
  ctx.fillStyle = state.options.bg;
  ctx.fillRect(0, 0, rect.width, rect.height);
  drawGraph(rect);
  requestAnimationFrame(loop);
}

function findNodeAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const world = screenToWorld(clientX - rect.left, clientY - rect.top);
  let best = null;
  let bestD = Infinity;
  for (const node of state.nodes) {
    if (!node.visible) continue;
    const d = Math.hypot(node.x - world.x, node.y - world.y) * state.camera.zoom;
    const hit = Math.max(10, node.radius * state.options.size * state.camera.zoom + 8);
    if (d < hit && d < bestD) {
      best = node;
      bestD = d;
    }
  }
  return best;
}

function onMouseDown(event) {
  state.lastMouse = { x: event.clientX, y: event.clientY };
  state.moved = false;
  if (event.button === 2) return;
  const node = findNodeAt(event.clientX, event.clientY);
  state.downNode = node;
  if (node) {
    state.dragging = node;
    node.vx = 0;
    node.vy = 0;
  } else {
    state.panning = true;
  }
  canvas.classList.add("dragging");
}

function onMouseMove(event) {
  const dxScreen = event.clientX - state.lastMouse.x;
  const dyScreen = event.clientY - state.lastMouse.y;
  if (Math.hypot(dxScreen, dyScreen) > 3) state.moved = true;

  if (state.dragging) {
    const rect = canvas.getBoundingClientRect();
    const world = screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
    state.dragging.x = world.x;
    state.dragging.y = world.y;
    state.dragging.vx = 0;
    state.dragging.vy = 0;
    state.lastMouse = { x: event.clientX, y: event.clientY };
    return;
  }
  if (state.panning) {
    state.camera.x += dxScreen;
    state.camera.y += dyScreen;
    state.lastMouse = { x: event.clientX, y: event.clientY };
    return;
  }
  state.hover = findNodeAt(event.clientX, event.clientY);
  canvas.style.cursor = state.hover ? "pointer" : "grab";
}

function onMouseUp(event) {
  state.dragging = null;
  state.downNode = null;
  state.panning = false;
  canvas.classList.remove("dragging");
  canvas.style.cursor = "grab";
}

function onClick(event) {
  if (state.moved) return;
  const node = findNodeAt(event.clientX, event.clientY);
  if (node) selectNode(node);
}

function onWheel(event) {
  event.preventDefault();
  const delta = event.deltaY > 0 ? 0.9 : 1.1;
  state.camera.zoom = Math.max(0.08, Math.min(5, state.camera.zoom * delta));
}

async function selectNode(node) {
  state.selected = node;
  openReader();
  setMode("read");
  el.fileTitle.textContent = node.title;
  el.filePath.textContent = node.path;
  el.preview.innerHTML = "Opening...";
  el.editor.value = "";
  el.saveStatus.textContent = "";
  el.editTab.disabled = !!node.virtual;
  el.saveBtn.disabled = !!node.virtual;
  if (node.virtual) {
    state.fileContent = "";
    el.preview.innerHTML = `<h1>${escapeHtml(node.title)}</h1><p><strong>Unresolved link.</strong></p>`;
    el.editor.value = "";
    return;
  }
  try {
    const data = await api(`/api/file?vault=${encodeURIComponent(state.vault)}&file=${encodeURIComponent(node.path)}`);
    state.fileContent = data.content;
    el.editor.value = data.content;
    renderMarkdown(data.content);
  } catch (err) {
    el.preview.textContent = err.message;
  }
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;",
  }[ch]));
}

function renderMarkdown(md) {
  const lines = md.split(/\r?\n/);
  const html = [];
  let inCode = false;
  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      inCode = !inCode;
      html.push(inCode ? "<pre><code>" : "</code></pre>");
      continue;
    }
    if (inCode) {
      html.push(escapeHtml(line) + "\n");
      continue;
    }
    if (line.startsWith("# ")) html.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
    else if (line.startsWith("## ")) html.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
    else if (line.startsWith("### ")) html.push(`<h3>${escapeHtml(line.slice(4))}</h3>`);
    else if (line.trim().startsWith("- ")) html.push(`<p>${escapeHtml(line)}</p>`);
    else if (!line.trim()) html.push("<br>");
    else html.push(`<p>${escapeHtml(line).replace(/\[\[([^\]]+)\]\]/g, "<code>[[$1]]</code>")}</p>`);
  }
  el.preview.innerHTML = html.join("");
}

function setMode(mode) {
  if (state.selected && state.selected.virtual && mode === "edit") return;
  state.mode = mode;
  document.body.classList.toggle("editing", mode === "edit");
  el.readTab.classList.toggle("active", mode === "read");
  el.editTab.classList.toggle("active", mode === "edit");
}

async function saveFile() {
  if (!state.selected || state.selected.virtual) return;
  el.saveStatus.textContent = "Saving...";
  try {
    const res = await fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vault: state.vault,
        file: state.selected.path,
        content: el.editor.value,
      }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Save failed");
    state.fileContent = el.editor.value;
    renderMarkdown(state.fileContent);
    setMode("read");
    el.saveStatus.textContent = `Saved. Backup: ${data.backup}`;
    await loadGraph({ keepCurrent: true });
  } catch (err) {
    el.saveStatus.textContent = err.message;
  }
}

async function syncBrain() {
  if (!state.vault) return;
  el.syncBtn.disabled = true;
  setStatus("Syncing with master...");
  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vault: state.vault }),
    });
    const data = await res.json();
    const summary = data.steps
      ? data.steps.map((step) => `${step.ok ? "OK" : "ERR"} ${step.command}\n${step.stdout || step.stderr || ""}`).join("\n\n")
      : data.error;
    setStatus(data.ok ? "Sync complete" : "Sync needs attention");
    el.logsOutput.textContent = summary || "Sync complete.";
    el.logsDialog.showModal();
    await loadGraph({ keepCurrent: true });
  } catch (err) {
    setStatus(err.message);
  } finally {
    el.syncBtn.disabled = false;
  }
}

async function openLogs() {
  if (!el.logsOutput.textContent || el.logsOutput.textContent === "No logs loaded yet.") {
    el.logsOutput.textContent = "Loading...";
  }
  el.logsDialog.showModal();
  try {
    const data = await api("/api/logs?limit=200");
    el.logsOutput.textContent = data.logs.map(formatLog).join("\n\n") || "No logs yet.";
  } catch (err) {
    el.logsOutput.textContent = err.message;
  }
}

async function clearLogs() {
  el.clearLogsBtn.disabled = true;
  try {
    const res = await fetch("/api/logs/clear", { method: "POST" });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Could not clear logs");
    el.logsOutput.textContent = "Logs cleared.";
  } catch (err) {
    el.logsOutput.textContent = err.message;
  } finally {
    el.clearLogsBtn.disabled = false;
  }
}

function formatLog(item) {
  const parts = [
    item.time || "",
    item.action || "",
    item.file ? `file: ${item.file}` : "",
    item.backup ? `backup: ${item.backup}` : "",
    item.message || "",
  ].filter(Boolean);
  return parts.join("\n");
}

async function loadMachineStats() {
  if (!state.vault) return;
  try {
    const data = await api(`/api/stats?vault=${encodeURIComponent(state.vault)}`);
    el.machineName.textContent = data.host || "Local machine";
    el.machineCpu.textContent = `${shortCpu(data.cpu?.model)} · ${data.cpu?.cores || "?"} cores`;
    el.machineCpuLoad.textContent = data.cpu?.usage == null ? "warming up" : `${Math.round(data.cpu.usage)}%`;
    el.machineRam.textContent = data.memory ? `${formatBytes(data.memory.used)} / ${formatBytes(data.memory.total)}` : "n/a";
    const brainBytes = data.vaultSize?.bytes ?? state.graph.stats?.totalBytes;
    el.machineDisk.textContent = brainBytes ? formatBytes(brainBytes) : "n/a";
    el.machineGrowth.textContent = growthEstimate(data.disk?.free, state.graph.stats?.avgFileBytes);
  } catch {
    // Machine stats are useful, but the graph remains primary.
  }
}

function shortCpu(model = "") {
  return model.replace(/\s+/g, " ").replace(/\(R\)|\(TM\)|CPU|@.*$/g, "").trim().slice(0, 34) || "CPU";
}

function formatBytes(value) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = Number(value || 0);
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n >= 10 || i === 0 ? Math.round(n) : n.toFixed(1)} ${units[i]}`;
}

function growthEstimate(freeBytes, avgFileBytes) {
  if (!freeBytes || !avgFileBytes) return "n/a";
  const possible = Math.floor(freeBytes / avgFileBytes);
  return `~${formatLargeNumber(possible)} notes left`;
}

function formatLargeNumber(value) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

init();
