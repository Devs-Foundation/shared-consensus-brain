const canvas = document.querySelector("#graphCanvas");
const ctx = canvas.getContext("2d");

const SETTINGS_VERSION = 5;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const BRAND_URL = "https://github.com/Devs-Foundation";
const brandLogo = new Image();
brandLogo.src = "/assets/devs-foundation-logo.png";

const state = {
  vault: "",
  graph: { nodes: [], links: [], folders: [], stats: {} },
  nodes: [],
  links: [],
  favorites: [],
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
  browserDir: "",
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
  favoritesTab: document.querySelector("#favoritesTab"),
  saveBtn: document.querySelector("#saveBtn"),
  deleteBtn: document.querySelector("#deleteBtn"),
  favoriteToggleBtn: document.querySelector("#favoriteToggleBtn"),
  backBtn: document.querySelector("#backBtn"),
  saveStatus: document.querySelector("#saveStatus"),
  searchResults: document.querySelector("#searchResults"),
  changeBox: document.querySelector("#changeBox"),
  reloadGraphBtn: document.querySelector("#reloadGraphBtn"),
  toggleReaderBtn: document.querySelector("#toggleReaderBtn"),
  dashboardToggleBtn: document.querySelector("#dashboardToggleBtn"),
  saveGraphBtn: document.querySelector("#saveGraphBtn"),
  newNoteBtn: document.querySelector("#newNoteBtn"),
  favoritesBtn: document.querySelector("#favoritesBtn"),
  gitDiffBtn: document.querySelector("#gitDiffBtn"),
  validateBtn: document.querySelector("#validateBtn"),
  openFolderBtn: document.querySelector("#openFolderBtn"),
  backupsBtn: document.querySelector("#backupsBtn"),
  syncBtn: document.querySelector("#syncBtn"),
  logsBtn: document.querySelector("#logsBtn"),
  logsDialog: document.querySelector("#logsDialog"),
  closeLogsBtn: document.querySelector("#closeLogsBtn"),
  clearLogsBtn: document.querySelector("#clearLogsBtn"),
  logsOutput: document.querySelector("#logsOutput"),
  backupsDialog: document.querySelector("#backupsDialog"),
  closeBackupsBtn: document.querySelector("#closeBackupsBtn"),
  createBackupBtn: document.querySelector("#createBackupBtn"),
  backupsList: document.querySelector("#backupsList"),
  fileBrowserDialog: document.querySelector("#fileBrowserDialog"),
  closeBrowserBtn: document.querySelector("#closeBrowserBtn"),
  browserSearch: document.querySelector("#browserSearch"),
  browserPath: document.querySelector("#browserPath"),
  fileBrowserList: document.querySelector("#fileBrowserList"),
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

function graphStatusText() {
  const stats = state.graph?.stats;
  if (!stats) return state.vault ? "Brain loaded" : "Choose a local brain folder to start.";
  return `${stats.files} files, ${stats.links} links`;
}

function restoreGraphStatus() {
  setStatus(graphStatusText());
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

async function readApiResponse(res, fallback = "Action failed") {
  const text = await res.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      const clean = text
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      throw new Error(clean || `${fallback} (${res.status})`);
    }
  }
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || data.message || `${fallback} (${res.status})`);
  }
  return data;
}

async function api(path, fallback = "Action failed") {
  const res = await fetch(path);
  return readApiResponse(res, fallback);
}

async function postJson(path, payload = {}, fallback = "Action failed") {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return readApiResponse(res, fallback);
}

function cleanError(err, fallback = "Action failed") {
  return String(err && err.message ? err.message : err || fallback)
    .replace(/\s+/g, " ")
    .trim();
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
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem("cerebro-vivo-theme") || "{}");
  } catch {
    saved = {};
  }
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
  el.newNoteBtn.addEventListener("click", createNote);
  el.favoritesBtn.addEventListener("click", showFavorites);
  el.gitDiffBtn.addEventListener("click", showBrainChanges);
  el.validateBtn.addEventListener("click", checkBrain);
  el.openFolderBtn.addEventListener("click", openBrainFolder);
  el.backupsBtn.addEventListener("click", openBackups);
  el.syncBtn.addEventListener("click", syncBrain);
  el.logsBtn.addEventListener("click", openLogs);
  el.closeLogsBtn.addEventListener("click", () => {
    el.logsDialog.close();
    restoreGraphStatus();
  });
  el.logsDialog.addEventListener("close", restoreGraphStatus);
  el.clearLogsBtn.addEventListener("click", clearLogs);
  el.closeBackupsBtn.addEventListener("click", () => el.backupsDialog.close());
  el.createBackupBtn.addEventListener("click", createBackup);
  el.closeBrowserBtn.addEventListener("click", () => el.fileBrowserDialog.close());
  el.browserSearch.addEventListener("input", renderBrowserSearch);
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
  el.favoritesTab.addEventListener("click", showFavorites);
  el.saveBtn.addEventListener("click", saveFile);
  el.deleteBtn.addEventListener("click", deleteFile);
  el.favoriteToggleBtn.addEventListener("click", toggleFavorite);
  el.backBtn.addEventListener("click", () => {
    state.selected = null;
    el.fileTitle.textContent = "Nothing selected";
    el.filePath.textContent = "Choose a node in the graph";
    el.preview.innerHTML = "";
    el.editor.value = "";
    el.editTab.disabled = false;
    el.saveBtn.disabled = false;
    el.deleteBtn.disabled = false;
    updateFavoriteButton();
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
  try {
    const data = await api(`/api/graph?vault=${encodeURIComponent(state.vault)}`, "Could not load brain");
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
    await loadFavorites();
    prepareGraph(data);
    applyFilters();
    fitGraphToView({ focusCore: true });
    requestAnimationFrame(() => fitGraphToView({ focusCore: true }));
    updateChangeBox([]);
    loadMachineStats();
    lockVaultPath();
    setStatus(`${data.stats.files} files, ${data.stats.links} links`);
  } catch (err) {
    const message = cleanError(err, "Could not load brain");
    setStatus(message);
    if (!state.graph) revealVaultPath();
  }
}

async function loadFavorites() {
  if (!state.vault) {
    state.favorites = [];
    return;
  }
  try {
    const data = await api(`/api/favorites?vault=${encodeURIComponent(state.vault)}`);
    state.favorites = Array.isArray(data.favorites) ? data.favorites : [];
  } catch {
    state.favorites = [];
  }
  updateFavoriteButton();
}

function isFavorite(path) {
  return state.favorites.includes(path);
}

function nodeByPath(path) {
  return state.nodes.find((node) => !node.virtual && node.path === path) || null;
}

function updateFavoriteButton() {
  const canFavorite = !!state.selected && !state.selected.virtual && state.mode !== "favorites";
  el.favoriteToggleBtn.disabled = !canFavorite;
  el.favoriteToggleBtn.classList.toggle("active", canFavorite && isFavorite(state.selected.path));
  el.favoriteToggleBtn.textContent = canFavorite && isFavorite(state.selected.path) ? "★" : "☆";
  el.favoriteToggleBtn.title = canFavorite && isFavorite(state.selected.path)
    ? "Remove from favorites"
    : "Mark as favorite";
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

  const anchors = visible.filter((node) => node.radius >= 8 || node.kind === "hub");
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i];
    for (let j = i + 1; j < anchors.length; j++) {
      const b = anchors[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 1;
      const minDist = 44 + (a.radius + b.radius) * 5.5;
      if (dist >= minDist) continue;
      const push = (minDist - dist) * 0.012 * motion;
      const fx = (dx / dist) * push;
      const fy = (dy / dist) * push;
      const aWeight = a.kind === "hub" ? 0.45 : 1;
      const bWeight = b.kind === "hub" ? 0.45 : 1;
      a.vx -= fx * aWeight;
      a.vy -= fy * aWeight;
      b.vx += fx * bWeight;
      b.vy += fy * bWeight;
    }
  }

  for (const node of visible) {
    const home = node.kind === "orphan" ? homeForce * 1.8 : homeForce;
    const center = node.kind === "orphan" ? 0 : centerForce;
    node.vx += (node.homeX - node.x) * home;
    node.vy += (node.homeY - node.y) * home;
    node.vx += -node.x * center;
    node.vy += -node.y * center;
    node.vx *= node.kind === "hub" ? 0.84 : 0.87;
    node.vy *= node.kind === "hub" ? 0.84 : 0.87;
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
  const panelWidth = includeMetrics ? 455 * scale : 390 * scale;
  const panelHeight = includeMetrics ? (142 + Math.ceil(metrics.length / 2) * 25) * scale : 104 * scale;
  const x = pad;
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
  if (brandLogo.complete && brandLogo.naturalWidth > 0) {
    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.arc(cx, cy, badge / 2, 0, Math.PI * 2);
    targetCtx.clip();
    targetCtx.drawImage(brandLogo, cx - badge / 2, cy - badge / 2, badge, badge);
    targetCtx.restore();
  } else {
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
  }

  targetCtx.textAlign = "left";
  targetCtx.textBaseline = "alphabetic";
  targetCtx.fillStyle = "#ffffff";
  targetCtx.font = `800 ${20 * scale}px Segoe UI, Arial`;
  targetCtx.fillText("Shared Consensus Brain", x + pad + badge + 13 * scale, y + pad + 20 * scale);
  targetCtx.fillStyle = "rgba(255,255,255,0.68)";
  targetCtx.font = `500 ${13 * scale}px Segoe UI, Arial`;
  targetCtx.fillText("Dev's Foundation · local vault snapshot", x + pad + badge + 13 * scale, y + pad + 42 * scale);
  targetCtx.fillStyle = "rgba(255,255,255,0.72)";
  targetCtx.font = `700 ${12 * scale}px Segoe UI, Arial`;
  targetCtx.fillText(BRAND_URL, x + pad + badge + 13 * scale, y + pad + 62 * scale);

  if (includeMetrics) {
    targetCtx.strokeStyle = "rgba(255,255,255,0.14)";
    targetCtx.beginPath();
    targetCtx.moveTo(x + pad, y + 104 * scale);
    targetCtx.lineTo(x + panelWidth - pad, y + 104 * scale);
    targetCtx.stroke();

    const leftX = x + pad;
    const rightX = x + panelWidth / 2 + 8 * scale;
    let rowY = y + 130 * scale;
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
  el.deleteBtn.disabled = !!node.virtual;
  updateFavoriteButton();
  if (node.virtual) {
    state.fileContent = "";
    el.preview.innerHTML = `<h1>${escapeHtml(node.title)}</h1><p><strong>Unresolved link.</strong></p>`;
    el.editor.value = "";
    updateFavoriteButton();
    return;
  }
  try {
    const data = await api(`/api/file?vault=${encodeURIComponent(state.vault)}&file=${encodeURIComponent(node.path)}`);
    state.fileContent = data.content;
    el.editor.value = data.content;
    renderMarkdown(data.content);
  } catch (err) {
    el.preview.textContent = cleanError(err, "Could not open file");
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

function normalizeDocKey(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\.?\//, "")
    .replace(/\.md$/i, "")
    .trim()
    .toLowerCase();
}

function stripLinkAnchor(value) {
  return String(value || "").split("#")[0].trim();
}

function normalizeRelativePath(basePath, target) {
  const clean = String(target || "").replace(/\\/g, "/").replace(/^\.\//, "");
  if (!clean.startsWith("../")) return clean;
  const stack = String(basePath || "").replace(/\\/g, "/").split("/").slice(0, -1);
  for (const part of clean.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return stack.join("/");
}

function resolveInternalNode(raw) {
  const target = stripLinkAnchor(raw);
  if (!target) return null;
  const decoded = decodeURIComponent(target).replace(/\\/g, "/");
  const clean = normalizeRelativePath(state.selected?.path || "", decoded);
  const key = normalizeDocKey(clean);
  const base = normalizeDocKey(clean.split("/").pop());
  return state.nodes.find((node) => !node.virtual && (
    normalizeDocKey(node.path) === key ||
    normalizeDocKey(node.id) === key ||
    normalizeDocKey(node.title) === key ||
    normalizeDocKey(node.path.split("/").pop()) === base
  )) || null;
}

function renderInlineMarkdown(text) {
  const tokens = [];
  const token = (html) => {
    const id = `\u0000LINK${tokens.length}\u0000`;
    tokens.push(html);
    return id;
  };

  let prepared = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (full, alt, href) => {
    return token(`<span class="md-image-ref">${escapeHtml(alt || href)}</span>`);
  });

  prepared = prepared.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (full, label, href) => {
    const decodedHref = href.trim();
    const isInternal = /\.md(?:#.*)?$/i.test(decodedHref) || decodedHref.startsWith("./") || decodedHref.startsWith("../");
    if (isInternal) {
      const node = resolveInternalNode(decodedHref);
      if (node) {
        return token(`<a href="#" class="internal-link" data-path="${escapeHtml(node.path)}">${escapeHtml(label)}</a>`);
      }
    }
    return token(`<a href="${escapeHtml(decodedHref)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`);
  });

  prepared = prepared.replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (full, raw, alias) => {
    const label = alias || raw;
    const node = resolveInternalNode(raw);
    if (node) {
      return token(`<a href="#" class="internal-link" data-path="${escapeHtml(node.path)}">${escapeHtml(label)}</a>`);
    }
    return token(`<span class="missing-link">[[${escapeHtml(label)}]]</span>`);
  });

  let html = escapeHtml(prepared);
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  tokens.forEach((value, index) => {
    html = html.replaceAll(`\u0000LINK${index}\u0000`, value);
  });
  return html;
}

function bindPreviewLinks() {
  el.preview.querySelectorAll(".internal-link").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const path = link.dataset.path;
      const node = state.nodes.find((item) => item.path === path);
      if (node) {
        focusNode(node);
        selectNode(node);
      }
    });
  });
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
    if (line.startsWith("# ")) html.push(`<h1>${renderInlineMarkdown(line.slice(2))}</h1>`);
    else if (line.startsWith("## ")) html.push(`<h2>${renderInlineMarkdown(line.slice(3))}</h2>`);
    else if (line.startsWith("### ")) html.push(`<h3>${renderInlineMarkdown(line.slice(4))}</h3>`);
    else if (line.trim().startsWith("- ")) html.push(`<p>${renderInlineMarkdown(line)}</p>`);
    else if (!line.trim()) html.push("<br>");
    else html.push(`<p>${renderInlineMarkdown(line)}</p>`);
  }
  el.preview.innerHTML = html.join("");
  bindPreviewLinks();
}

function setMode(mode) {
  if (state.selected && state.selected.virtual && mode === "edit") return;
  state.mode = mode;
  document.body.classList.toggle("editing", mode === "edit");
  document.body.classList.toggle("favorites-mode", mode === "favorites");
  el.readTab.classList.toggle("active", mode === "read");
  el.editTab.classList.toggle("active", mode === "edit");
  el.favoritesTab.classList.toggle("active", mode === "favorites");
  updateFavoriteButton();
}

function showFavorites() {
  if (!state.vault) {
    setStatus("Load a brain folder first.");
    return;
  }
  openReader();
  setMode("favorites");
  el.fileTitle.textContent = "Favorites";
  el.filePath.textContent = "Pinned documents in this local brain";
  el.saveStatus.textContent = "";
  el.editTab.disabled = true;
  el.saveBtn.disabled = true;
  el.deleteBtn.disabled = true;

  const items = state.favorites.map((path) => ({ path, node: nodeByPath(path) }));
  if (!items.length) {
    el.preview.innerHTML = `
      <div class="favorites-empty">
        <h2>No favorites yet</h2>
        <p>Open a document and use the star to keep it close.</p>
      </div>
    `;
    return;
  }

  el.preview.innerHTML = `
    <div class="favorites-list">
      ${items.map(({ path, node }) => `
        <button class="favorite-item ${node ? "" : "missing"}" data-path="${escapeHtml(path)}">
          <strong>${escapeHtml(node ? node.title : titleFromPath(path))}</strong>
          <small>${escapeHtml(path)}${node ? "" : " · missing"}</small>
        </button>
      `).join("")}
    </div>
  `;

  el.preview.querySelectorAll(".favorite-item").forEach((button) => {
    button.addEventListener("click", () => {
      const node = nodeByPath(button.dataset.path);
      if (!node) return;
      focusNode(node);
      selectNode(node);
    });
  });
}

function titleFromPath(path) {
  return String(path || "")
    .split("/")
    .pop()
    .replace(/\.md$/i, "")
    .replaceAll("-", " ")
    .replaceAll("_", " ");
}

async function toggleFavorite() {
  if (!state.selected || state.selected.virtual) return;
  const next = !isFavorite(state.selected.path);
  const file = state.selected.path;
  const before = [...state.favorites];
  if (next) state.favorites = Array.from(new Set([...state.favorites, file]));
  else state.favorites = state.favorites.filter((item) => item !== file);
  updateFavoriteButton();
  if (state.mode === "favorites") showFavorites();
  el.favoriteToggleBtn.disabled = true;
  try {
    const data = await postJson("/api/favorite", {
      vault: state.vault,
      file,
      favorite: next,
    }, "Favorite failed");
    state.favorites = Array.isArray(data.favorites) ? data.favorites : [];
    setStatus(next ? "Added to favorites" : "Removed from favorites");
  } catch (err) {
    state.favorites = before;
    setStatus(cleanError(err, "Favorite failed"));
  } finally {
    updateFavoriteButton();
  }
}

async function saveFile() {
  if (!state.selected || state.selected.virtual) return;
  el.saveStatus.textContent = "Saving...";
  try {
    const data = await postJson("/api/save", {
      vault: state.vault,
      file: state.selected.path,
      content: el.editor.value,
    }, "Save failed");
    state.fileContent = el.editor.value;
    renderMarkdown(state.fileContent);
    setMode("read");
    el.saveStatus.textContent = `Saved. Backup: ${data.backup}`;
    await loadGraph({ keepCurrent: true });
  } catch (err) {
    el.saveStatus.textContent = cleanError(err, "Save failed");
  }
}

async function deleteFile() {
  if (!state.selected || state.selected.virtual) return;
  const file = state.selected.path;
  const ok = confirm(`Delete this note?\n\n${file}\n\nA backup will be created first.`);
  if (!ok) return;
  el.saveStatus.textContent = "Deleting...";
  try {
    const data = await postJson("/api/delete", { vault: state.vault, file }, "Delete failed");
    state.selected = null;
    state.favorites = state.favorites.filter((item) => item !== file);
    state.fileContent = "";
    el.fileTitle.textContent = "Nothing selected";
    el.filePath.textContent = "Choose a node in the graph";
    el.preview.innerHTML = "";
    el.editor.value = "";
    el.saveStatus.textContent = `Deleted. Backup: ${data.backup}`;
    updateFavoriteButton();
    setMode("read");
    closeReader();
    await loadGraph({ keepCurrent: false });
    setStatus(`Deleted ${file}`);
  } catch (err) {
    const message = cleanError(err, "Delete failed");
    el.saveStatus.textContent = message;
    setStatus(message);
  }
}

function noteContextLinks(title) {
  const terms = `${title || ""} ${el.search.value || ""}`
    .toLowerCase()
    .split(/[^a-z0-9_áàâãéèêíóôõúç]+/i)
    .filter((term) => term.length >= 3);
  const links = [];
  if (state.selected && !state.selected.virtual) links.push(state.selected.path.replace(/\.md$/i, ""));
  if (!terms.length) return links.slice(0, 6);

  const scored = state.nodes
    .filter((node) => !node.virtual && node.path)
    .map((node) => {
      const haystack = `${node.title || ""} ${node.path || ""} ${node.searchText || ""}`.toLowerCase();
      const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
      return { node, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || (b.node.degree || 0) - (a.node.degree || 0));

  for (const item of scored) {
    const link = item.node.path.replace(/\.md$/i, "");
    if (!links.includes(link)) links.push(link);
    if (links.length >= 6) break;
  }
  return links;
}

async function createNote() {
  if (!state.vault) {
    setStatus("Load a brain folder first.");
    return;
  }
  const title = prompt("New note title", "New note");
  if (title === null) return;
  const cleanTitle = title.trim();
  if (!cleanTitle) {
    setStatus("New note needs a title.");
    return;
  }
  const folder = state.options.folder || "";
  const contextLinks = noteContextLinks(cleanTitle);
  el.newNoteBtn.disabled = true;
  setStatus("Creating note...");
  try {
    const data = await postJson("/api/new-note", {
      vault: state.vault,
      folder,
      title: cleanTitle,
      contextLinks,
    }, "Create failed");
    el.search.value = "";
    await loadGraph({ keepCurrent: true });
    const node = state.nodes.find((item) => item.path === data.path);
    if (node) {
      focusNode(node);
      await selectNode(node);
      setMode("edit");
      el.editor.focus();
      el.editor.setSelectionRange(el.editor.value.length, el.editor.value.length);
    }
    setStatus(`Created ${data.path}`);
  } catch (err) {
    setStatus(cleanError(err, "Create failed"));
  } finally {
    el.newNoteBtn.disabled = false;
  }
}

async function postVaultAction(path, button, loadingText, doneText = "Done.") {
  if (!state.vault) {
    setStatus("Load a brain folder first.");
    return null;
  }
  button.disabled = true;
  setStatus(loadingText);
  el.logsOutput.textContent = `${loadingText}\n`;
  el.logsDialog.showModal();
  try {
    const data = await postJson(path, { vault: state.vault }, "Action failed");
    el.logsOutput.textContent = data.report || data.message || doneText;
    setStatus(doneText);
    return data;
  } catch (err) {
    const message = cleanError(err, "Action failed");
    el.logsOutput.textContent = message;
    setStatus(message);
    return null;
  } finally {
    button.disabled = false;
  }
}

async function showBrainChanges() {
  await postVaultAction("/api/git-diff", el.gitDiffBtn, "Checking local changes...", "Changes report ready");
}

async function checkBrain() {
  await postVaultAction("/api/validate", el.validateBtn, "Checking brain health...", "Brain check complete");
}

async function openBrainFolder() {
  if (!state.vault) {
    setStatus("Load a brain folder first.");
    return;
  }
  state.browserDir = "";
  el.browserSearch.value = "";
  el.browserPath.textContent = "/";
  el.fileBrowserDialog.showModal();
  await loadBrowserFolder("", el.fileBrowserList, 0);
}

async function loadBrowserFolder(dir = "", container = el.fileBrowserList, depth = 0) {
  if (!state.vault) return;
  const target = container || el.fileBrowserList;
  const cleanDir = dir || "";
  if (target === el.fileBrowserList) {
    state.browserDir = cleanDir;
    el.browserPath.textContent = cleanDir ? `/${cleanDir}` : "/";
  }
  target.textContent = "Loading...";
  try {
    const data = await api(`/api/browse?vault=${encodeURIComponent(state.vault)}&dir=${encodeURIComponent(cleanDir)}`);
    if (target === el.fileBrowserList) {
      state.browserDir = data.dir || "";
      el.browserPath.textContent = state.browserDir ? `/${state.browserDir}` : "/";
    }
    renderBrowserItems(data.items || [], target, depth);
  } catch (err) {
    const message = cleanError(err, "Could not open folder");
    target.textContent = message;
    setStatus(message);
  }
}

function renderBrowserItems(items, container = el.fileBrowserList, depth = 0) {
  container.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "browser-empty";
    empty.textContent = "This folder has no Markdown notes.";
    container.appendChild(empty);
    return;
  }

  const tree = document.createElement("div");
  tree.className = "browser-tree";
  for (const item of items) {
    const button = document.createElement("button");
    button.className = `browser-item ${item.type === "folder" ? "folder" : "file"}`;
    button.type = "button";
    button.style.paddingLeft = `${8 + depth * 18}px`;
    const title = item.type === "folder" ? item.name : (item.title || titleFromPath(item.path));
    const detail = item.type === "folder" ? item.path : `${item.path} · ${formatBytes(item.bytes || 0)}`;
    button.innerHTML = `
      <span class="browser-arrow">▸</span>
      <span class="browser-icon">${item.type === "folder" ? "DIR" : "MD"}</span>
      <span>
        <strong>${escapeHtml(title)}</strong>
        <small>${escapeHtml(detail)}</small>
      </span>
      ${item.type === "file" ? '<span class="browser-edit-action">Edit</span>' : ""}
    `;
    const wrapper = document.createElement("div");
    wrapper.appendChild(button);
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      if (item.type === "folder") {
        const existing = wrapper.querySelector(":scope > .browser-children");
        if (existing) {
          existing.remove();
          button.classList.remove("open");
          return;
        }
        button.classList.add("open");
        const children = document.createElement("div");
        children.className = "browser-children";
        wrapper.appendChild(children);
        await loadBrowserFolder(item.path, children, depth + 1);
        return;
      }
      await openBrowserFile(item);
    });
    tree.appendChild(wrapper);
  }
  container.appendChild(tree);
}

function renderBrowserSearch() {
  const query = el.browserSearch.value.trim().toLowerCase();
  if (!query) {
    loadBrowserFolder(state.browserDir || "", el.fileBrowserList, 0);
    return;
  }

  el.browserPath.textContent = `Search: ${query}`;
  const results = state.nodes
    .filter((node) => !node.virtual)
    .filter((node) => `${node.title || ""} ${node.path || ""} ${node.searchText || ""}`.toLowerCase().includes(query))
    .slice(0, 120)
    .map((node) => ({
      type: "file",
      path: node.path,
      title: node.title || titleFromPath(node.path),
      bytes: 0,
    }));
  renderBrowserItems(results, el.fileBrowserList, 0);
}

async function openBrowserFile(item) {
  const node = nodeByPath(item.path) || {
    id: item.path,
    path: item.path,
    title: item.title || titleFromPath(item.path),
    folder: item.path.includes("/") ? item.path.split("/")[0] : "root",
    virtual: false,
  };
  el.fileBrowserDialog.close();
  const realNode = nodeByPath(item.path);
  if (realNode) focusNode(realNode);
  await selectNode(realNode || node);
  setMode("edit");
  el.editor.focus();
}

async function syncBrain() {
  if (!state.vault) return;
  el.syncBtn.disabled = true;
  setStatus("Syncing with master...");
  try {
    const data = await postJson("/api/sync", { vault: state.vault }, "Sync failed");
    const summary = data.steps
      ? data.steps.map((step) => `${step.ok ? "OK" : "ERR"} ${step.command}\n${step.stdout || step.stderr || ""}`).join("\n\n")
      : data.error;
    setStatus(data.ok ? "Sync complete" : "Sync needs attention");
    el.logsOutput.textContent = summary || "Sync complete.";
    el.logsDialog.showModal();
    await loadGraph({ keepCurrent: true });
  } catch (err) {
    const message = cleanError(err, "Sync failed");
    setStatus(message);
    el.logsOutput.textContent = message;
    el.logsDialog.showModal();
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
    el.logsOutput.textContent = cleanError(err, "Could not load logs");
  }
}

async function clearLogs() {
  el.clearLogsBtn.disabled = true;
  try {
    await postJson("/api/logs/clear", {}, "Could not clear logs");
    el.logsOutput.textContent = "Logs cleared.";
  } catch (err) {
    el.logsOutput.textContent = cleanError(err, "Could not clear logs");
  } finally {
    el.clearLogsBtn.disabled = false;
  }
}

async function openBackups() {
  if (!state.vault) {
    setStatus("Load a brain folder first.");
    return;
  }
  el.backupsList.textContent = "Loading backups...";
  el.backupsDialog.showModal();
  await refreshBackups();
}

async function refreshBackups() {
  try {
    const data = await api(`/api/backups?vault=${encodeURIComponent(state.vault)}`);
    renderBackups(data.backups || []);
  } catch (err) {
    el.backupsList.textContent = cleanError(err, "Could not load backups");
  }
}

function renderBackups(backups) {
  if (!backups.length) {
    el.backupsList.innerHTML = `<div class="hint">No backups yet. Create one before risky edits.</div>`;
    return;
  }
  el.backupsList.innerHTML = backups.map((backup) => `
    <div class="backup-item" data-id="${escapeHtml(backup.id)}">
      <div>
        <strong>${escapeHtml(new Date(backup.created).toLocaleString())}</strong>
        <small>${escapeHtml(backup.path)} · ${backup.files} files · ${formatBytes(backup.bytes)}</small>
      </div>
      <div class="backup-actions">
        <button class="open-backup-btn">Open</button>
        <button class="delete-backup-btn danger">Delete</button>
      </div>
    </div>
  `).join("");
  el.backupsList.querySelectorAll(".backup-item").forEach((item) => {
    item.querySelector(".open-backup-btn").addEventListener("click", () => openBackupFolder(item.dataset.id));
    item.querySelector(".delete-backup-btn").addEventListener("click", () => deleteBackup(item.dataset.id));
  });
}

async function createBackup() {
  if (!state.vault) return;
  el.createBackupBtn.disabled = true;
  el.backupsList.textContent = "Creating backup...";
  try {
    const data = await postJson("/api/backups/create", { vault: state.vault }, "Could not create backup");
    renderBackups(data.backups || []);
    el.logsOutput.textContent = `Backup created\n${data.backup.path}\n${data.backup.files} files · ${formatBytes(data.backup.bytes)}`;
    setStatus("Backup created.");
  } catch (err) {
    const message = cleanError(err, "Could not create backup");
    el.backupsList.textContent = message;
    setStatus(message);
  } finally {
    el.createBackupBtn.disabled = false;
  }
}

async function deleteBackup(id) {
  if (!state.vault || !id) return;
  if (!confirm(`Delete this backup?\n\n${id}`)) return;
  try {
    const data = await postJson("/api/backups/delete", { vault: state.vault, id }, "Could not delete backup");
    renderBackups(data.backups || []);
    setStatus("Backup deleted.");
  } catch (err) {
    setStatus(cleanError(err, "Could not delete backup"));
  }
}

async function openBackupFolder(id) {
  if (!state.vault || !id) return;
  try {
    await postJson("/api/backups/open", { vault: state.vault, id }, "Could not open backup");
    setStatus("Backup folder opened.");
  } catch (err) {
    setStatus(cleanError(err, "Could not open backup"));
  }
}

function formatLog(item) {
  const actor = item.actor
    ? `${item.actor.name || ""}${item.actor.machine ? ` @ ${item.actor.machine}` : ""}${item.actor.source ? ` (${item.actor.source})` : ""}`.trim()
    : "";
  const origin = item.origin
    ? [item.origin.client, item.origin.address].filter(Boolean).join(" · ")
    : "";
  const metrics = [
    Number.isFinite(item.files) ? `files: ${item.files}` : "",
    Number.isFinite(item.links) ? `links: ${item.links}` : "",
    Number.isFinite(item.folders) ? `folders: ${item.folders}` : "",
    Number.isFinite(item.bytes) ? `bytes: ${formatBytes(item.bytes)}` : "",
  ].filter(Boolean).join(" · ");
  const steps = Array.isArray(item.steps) && item.steps.length
    ? item.steps.map((step) => {
      const status = step.ok ? "ok" : "fail";
      const output = [step.stdout, step.stderr].filter(Boolean).join(" | ");
      return `  - ${status}: ${step.command}${output ? ` -> ${output}` : ""}`;
    }).join("\n")
    : "";
  const parts = [
    item.time || "",
    item.label || item.action || "",
    actor ? `actor: ${actor}` : "",
    origin ? `origin: ${origin}` : "",
    item.vault ? `vault: ${item.vault}` : "",
    item.file ? `file: ${item.file}` : "",
    item.backup ? `backup: ${item.backup}` : "",
    metrics,
    item.message || "",
    steps,
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
