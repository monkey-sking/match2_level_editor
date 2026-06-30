/**
 * Generate-LevelPreview.js
 *
 * 从 data/projects.json 读取所有项目配置，
 * 读取各项目的关卡 xlsx 配置文件，
 * 生成 level_config_preview.html（多项目 + 多配置文件切换预览）
 *
 * 用法：node Generate-LevelPreview.js
 */

const fs   = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const ROOT           = __dirname;
const PROJECTS_JSON  = path.join(ROOT, 'data', 'projects.json');
const TEMPLATES_JSON = path.join(ROOT, 'data', 'BoardTemplates.json');
const OUTPUT_HTML    = path.join(ROOT, 'level_config_preview.html');

// ── 读取项目注册表 ─────────────────────────────────────────────
const projectsCfg = JSON.parse(fs.readFileSync(PROJECTS_JSON, 'utf8'));

// ── 从 Board.xlsx 读取棋盘模板 ──────────────────────────────────
function readBoardTemplatesFromExcel(filePath) {
    if (!fs.existsSync(filePath)) {
        console.warn(`[WARN] File not found: ${filePath}`);
        return {};
    }
    const wb = XLSX.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const map = {};
    for (let i = 4; i < rows.length; i++) {
        const r = rows[i];
        if (r[1] == null) continue; // id
        const x = parseInt(r[2]);
        const y = parseInt(r[3]);
        const layout = parseInt(r[4]);
        const boardId = parseInt(r[6]);
        if (isNaN(x) || isNaN(y) || isNaN(layout) || isNaN(boardId)) continue;
        
        if (!map[boardId]) {
            map[boardId] = { id: boardId, layers: {} };
        }
        if (!map[boardId].layers[layout]) {
            map[boardId].layers[layout] = [];
        }
        map[boardId].layers[layout].push({ x, y });
    }
    return map;
}

// ── 读取单个关卡 xlsx ─────────────────────────────────────────
function readLevelConfig(filePath) {
    if (!fs.existsSync(filePath)) {
        console.warn(`[WARN] File not found: ${filePath}`);
        return [];
    }
    const wb    = XLSX.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows  = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const levels = [];
    for (let i = 4; i < rows.length; i++) {
        const r = rows[i];
        if (r[1] == null) continue;
        levels.push({
            id:           r[1],
            startId:      r[2],
            endId:        r[3],
            boardIn:      r[4] ? String(r[4]).split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)) : [],
            item:         r[5] ? String(r[5]).split(',').map(s => s.trim()).filter(Boolean) : [],
            initItem:     r[6] ? String(r[6]).split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)) : [],
            num:          r[7] || 0,
            backSpawnPos: r[8] || '',
        });
    }
    return levels;
}

// ── 整合所有项目数据 ───────────────────────────────────────────
const projectTemplates = {};
projectsCfg.projects.forEach(proj => {
    const boardExcelPath = path.join(proj.configDir, 'Board.xlsx');
    projectTemplates[proj.id] = readBoardTemplatesFromExcel(boardExcelPath);
    console.log(`[${proj.id}] Loaded board templates from ${boardExcelPath}`);
});

const allProjects = projectsCfg.projects.map(proj => {
    const configs = proj.levelConfigs.map(cfg => {
        const filePath = path.join(proj.configDir, cfg.file);
        const levels   = readLevelConfig(filePath);
        console.log(`[${proj.id}] ${cfg.label}: ${levels.length} 关 (${filePath})`);
        return { ...cfg, levels };
    });
    return { ...proj, levelConfigs: configs };
});

// ── 棋牌类型元数据 ─────────────────────────────────────────────
const ITEM_LABELS = {
    QJST:    '取经师徒',
    QQJSTQB: '取经师徒Q版',
    SWKHS:   '孙悟空化身',
    TTSX:    '天庭神仙',
    SDTW:    '四大天王',
    FJ:      '佛界',
    YMJG:    '妖魔精怪',
    FBLW:    '法宝灵物',
};
const ITEM_COLORS = {
    QJST:    '#4bcffa',
    QQJSTQB: '#0be881',
    SWKHS:   '#ffd32a',
    TTSX:    '#ff9f43',
    SDTW:    '#ff3f34',
    FJ:      '#a29bfe',
    YMJG:    '#fd79a8',
    FBLW:    '#e17055',
};

// ── 生成 HTML ──────────────────────────────────────────────────
const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>关卡配置预览</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=Outfit:wght@400;600;800&display=swap" rel="stylesheet">
<style>
:root {
  --bg: #0c0c0f;
  --surface: #14141a;
  --surface2: #1c1c24;
  --surface3: #22222c;
  --border: #28283a;
  --text: #ededf5;
  --muted: #606078;
  --success: #0be881;
  --l1: #808e9b; --l2: #4bcffa; --l3: #0be881; --l4: #ffd32a; --l5: #ff3f34;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Inter', sans-serif;
  background: var(--bg);
  color: var(--text);
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ── Topbar ──────────────────────────────────────────── */
.topbar {
  display: flex;
  align-items: center;
  gap: 0;
  height: 52px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  flex-shrink: 0;
}
.logo {
  padding: 0 20px;
  font-family: 'Outfit', sans-serif;
  font-size: 17px;
  font-weight: 800;
  background: linear-gradient(135deg, #ffd32a, #ff6b35);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  white-space: nowrap;
  border-right: 1px solid var(--border);
  height: 100%;
  display: flex;
  align-items: center;
}

/* ── Project Tabs ─────────────────────────────────────── */
.project-tabs {
  display: flex;
  height: 100%;
  border-right: 1px solid var(--border);
}
.project-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
  border-bottom: 3px solid transparent;
  transition: all 0.2s;
  user-select: none;
  white-space: nowrap;
  border-right: 1px solid var(--border);
}
.project-tab:hover { color: var(--text); background: rgba(255,255,255,0.03); }
.project-tab.active { color: var(--text); border-bottom-color: var(--project-color); background: rgba(255,255,255,0.04); }
.project-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ── Config File Tabs (inside project) ───────────────── */
.config-tabs {
  display: flex;
  height: 100%;
  gap: 0;
}
.config-tab {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 18px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
  border-bottom: 3px solid transparent;
  transition: all 0.2s;
  user-select: none;
  white-space: nowrap;
  border-right: 1px solid var(--border);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.config-tab:hover { color: var(--text); background: rgba(255,255,255,0.03); }
.config-tab.active { color: var(--text); border-bottom-color: var(--cfg-color); }
.config-count {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 700;
}

/* ── Main Layout ─────────────────────────────────────── */
.main {
  display: grid;
  grid-template-columns: 270px 1fr;
  flex: 1;
  overflow: hidden;
}

/* ── Level List ──────────────────────────────────────── */
.list-panel {
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--surface);
}
.list-header {
  padding: 12px 14px 10px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.search-box {
  width: 100%;
  background: rgba(0,0,0,0.25);
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 8px 12px;
  color: var(--text);
  font-size: 13px;
  outline: none;
  font-family: 'Inter', sans-serif;
  transition: border-color 0.2s;
}
.search-box:focus { border-color: #555; }
.search-box::placeholder { color: var(--muted); }
.filter-chips { display: flex; gap: 5px; flex-wrap: wrap; }
.chip {
  padding: 3px 9px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--muted);
  font-family: 'Inter', sans-serif;
  transition: all 0.15s;
}
.chip.active { color: #111; }
.chip:hover:not(.active) { color: var(--text); }

.level-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
}
.level-list::-webkit-scrollbar { width: 3px; }
.level-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 2px; }

.level-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border-radius: 7px;
  cursor: pointer;
  border: 1px solid transparent;
  margin-bottom: 2px;
  transition: all 0.15s;
  user-select: none;
}
.level-item:hover { background: rgba(255,255,255,0.04); }
.level-item.active-item {
  border-color: rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.06);
}
.lv-num {
  font-family: 'Outfit', sans-serif;
  font-weight: 800;
  font-size: 14px;
  min-width: 32px;
}
.lv-meta { flex: 1; min-width: 0; }
.lv-board { font-size: 12px; font-weight: 600; color: var(--text); }
.lv-chips { display: flex; gap: 2px; margin-top: 2px; flex-wrap: wrap; }
.mini-chip {
  font-size: 8px; font-weight: 800;
  padding: 1px 4px; border-radius: 3px; color: #111;
}
.lv-badge {
  font-size: 10px; font-weight: 700;
  padding: 2px 6px; border-radius: 4px;
  background: rgba(255,255,255,0.06); color: var(--muted);
  white-space: nowrap;
}

/* ── Preview Panel ───────────────────────────────────── */
.preview-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.preview-head {
  padding: 14px 22px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
  background: var(--surface);
  min-height: 64px;
}
.preview-title {
  font-family: 'Outfit', sans-serif;
  font-size: 20px;
  font-weight: 800;
}
.preview-sub { color: var(--muted); font-size: 12px; margin-top: 2px; }
.tag-row { display: flex; gap: 6px; flex-wrap: wrap; margin-left: auto; }
.tag {
  padding: 4px 12px; border-radius: 16px;
  font-size: 11px; font-weight: 700;
  border: 1px solid currentColor;
}

.preview-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 20px;
  align-items: start;
}
.preview-body::-webkit-scrollbar { width: 4px; }
.preview-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); border-radius: 2px; }

/* ── Board Canvas Box ────────────────────────────────── */
.board-box {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  min-width: 300px;
}
.board-box-title {
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.5px;
  color: var(--muted); align-self: flex-start;
}
.layer-legend { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.legend-row { display: flex; align-items: center; gap: 7px; font-size: 12px; color: #aaa; }
.legend-dot { width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; }

/* ── Info Cards ──────────────────────────────────────── */
.info-col { display: flex; flex-direction: column; gap: 14px; }
.info-card {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px 18px;
}
.info-card-title {
  font-size: 10px; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.6px;
  color: var(--muted); margin-bottom: 12px;
}
.info-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
  font-size: 13px;
}
.info-row:last-child { border-bottom: none; }
.info-row .k { color: var(--muted); }
.info-row .v { font-weight: 700; }
.item-grid { display: flex; flex-wrap: wrap; gap: 7px; }
.item-card {
  padding: 7px 12px; border-radius: 7px;
  font-size: 12px; font-weight: 700;
  display: flex; align-items: center; gap: 5px;
}
.item-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

.empty-state {
  grid-column: 1/-1;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  height: 100%; gap: 10px; color: var(--muted);
}
.empty-icon { font-size: 44px; opacity: 0.25; }
canvas { display: block; }
</style>
</head>
<body>

<!-- ── Topbar ───────────────────────────────────────── -->
<div class="topbar">
  <div class="logo">📋 关卡配置预览</div>
  <div class="project-tabs" id="project-tabs"></div>
  <div class="config-tabs"  id="config-tabs"></div>
</div>

<!-- ── Main ─────────────────────────────────────────── -->
<div class="main">
  <div class="list-panel">
    <div class="list-header">
      <input type="text" class="search-box" id="search-box" placeholder="🔍 搜索关卡号..." oninput="filterLevels()">
      <div class="filter-chips" id="filter-chips">
        <button class="chip active" onclick="setFilter('all',this)">全部</button>
        <button class="chip" onclick="setFilter('2',this)">2种</button>
        <button class="chip" onclick="setFilter('3',this)">3种</button>
        <button class="chip" onclick="setFilter('4',this)">4种</button>
        <button class="chip" onclick="setFilter('5',this)">5种</button>
        <button class="chip" onclick="setFilter('6+',this)">6+种</button>
      </div>
      <div id="board-filter-banner" style="display:none; margin-top:8px; padding:6px 12px; background:rgba(75, 207, 250, 0.12); border:1px solid rgba(75, 207, 250, 0.25); border-radius:6px; font-size:12px; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
        <span style="color:#4bcffa; font-weight:600;">🔍 筛选棋盘: #<span id="filtered-board-id"></span></span>
        <button onclick="clearBoardFilter()" style="background:none; border:none; color:#ff3f34; cursor:pointer; font-weight:700; font-size:12px; padding:0; outline:none;">清除筛选</button>
      </div>
    </div>
    <div class="level-list" id="level-list"></div>
  </div>
  <div class="preview-panel">
    <div class="preview-head" id="preview-head">
      <div>
        <div class="preview-title">选择一个关卡</div>
        <div class="preview-sub">点击左侧列表查看关卡详情</div>
      </div>
    </div>
    <div class="preview-body" id="preview-body">
      <div class="empty-state">
        <div class="empty-icon">🎮</div>
        <div style="font-size:15px;font-weight:600">选择左侧关卡开始预览</div>
      </div>
    </div>
  </div>
</div>

<script>
// ── 数据注入 ──────────────────────────────────────────
const ALL_PROJECTS    = ${JSON.stringify(allProjects)};
const PROJECT_BOARD_TEMPLATES = ${JSON.stringify(projectTemplates)};
const ITEM_LABELS     = ${JSON.stringify(ITEM_LABELS)};
const ITEM_COLORS     = ${JSON.stringify(ITEM_COLORS)};
const LAYER_COLORS    = ['#808e9b','#4bcffa','#0be881','#ffd32a','#ff3f34'];

// ── State ──────────────────────────────────────────────
let curProjectIdx = 0;
let curConfigIdx  = 0;
let curLevelId    = null;
let activeFilter  = 'all';
let filterBoardId = null;

function curBoardTemplates() { return PROJECT_BOARD_TEMPLATES[curProject().id] || {}; }

// 解析 URL 参数中的 boardId 并进行自动定位
const urlParams = new URLSearchParams(window.location.search);
const paramBoardId = parseInt(urlParams.get('boardId'));
if (!isNaN(paramBoardId)) {
  filterBoardId = paramBoardId;
  let found = false;
  for (let pIdx = 0; pIdx < ALL_PROJECTS.length; pIdx++) {
    const proj = ALL_PROJECTS[pIdx];
    for (let cIdx = 0; cIdx < proj.levelConfigs.length; cIdx++) {
      const cfg = proj.levelConfigs[cIdx];
      if (cfg.levels.some(l => l.boardIn.includes(filterBoardId))) {
        curProjectIdx = pIdx;
        curConfigIdx = cIdx;
        found = true;
        break;
      }
    }
    if (found) break;
  }
}

function curProject() { return ALL_PROJECTS[curProjectIdx]; }
function curConfig()  { return curProject().levelConfigs[curConfigIdx]; }
function curLevels()  { return curConfig().levels; }

// ── Init topbar ────────────────────────────────────────
function buildTopbar() {
  // Project tabs
  const ptEl = document.getElementById('project-tabs');
  ptEl.innerHTML = ALL_PROJECTS.map((p, i) => {
    const color = p.levelConfigs[0].color;
    return \`<div class="project-tab \${i===curProjectIdx?'active':''}"
      style="--project-color:\${color}"
      onclick="switchProject(\${i})">
      <div class="project-dot" style="background:\${color}"></div>
      \${p.name}
    </div>\`;
  }).join('');

  // Config tabs
  buildConfigTabs();
}

function buildConfigTabs() {
  const ctEl = document.getElementById('config-tabs');
  const proj = curProject();
  ctEl.innerHTML = proj.levelConfigs.map((cfg, i) => {
    const isActive = i === curConfigIdx;
    return \`<div class="config-tab \${isActive?'active':''}"
      style="--cfg-color:\${cfg.color}"
      onclick="switchConfig(\${i})">
      <span class="config-count" style="background:\${cfg.color}22;color:\${cfg.color}">\${cfg.levels.length}</span>
      \${cfg.label}
    </div>\`;
  }).join('');
}

function switchProject(idx) {
  curProjectIdx = idx;
  curConfigIdx  = 0;
  curLevelId    = null;
  buildTopbar();
  if (filterBoardId !== null) {
    const visible = curLevels().filter(l => l.boardIn.includes(filterBoardId));
    if (visible.length > 0) {
      selectLevel(visible[0].id);
      return;
    }
  }
  renderList();
  renderEmpty();
}

function switchConfig(idx) {
  curConfigIdx = idx;
  curLevelId   = null;
  buildConfigTabs();
  if (filterBoardId !== null) {
    const visible = curLevels().filter(l => l.boardIn.includes(filterBoardId));
    if (visible.length > 0) {
      selectLevel(visible[0].id);
      return;
    }
  }
  renderList();
  renderEmpty();
}

// ── Filter ─────────────────────────────────────────────
function setFilter(val, el) {
  activeFilter = val;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  const color = curConfig().color;
  el.style.background = color;
  el.style.borderColor = color;
  renderList();
}

function filterLevels() { renderList(); }

function matchFilter(lv) {
  const n = lv.item.length;
  if (activeFilter === 'all') return true;
  if (activeFilter === '6+')  return n >= 6;
  return n === parseInt(activeFilter);
}

function matchSearch(lv) {
  const q = document.getElementById('search-box').value.trim();
  return !q || String(lv.id).includes(q);
}

// ── Render List ────────────────────────────────────────
function renderList() {
  const levels  = curLevels();
  const cfg     = curConfig();
  const visible = levels.filter(l => {
    if (filterBoardId !== null && !l.boardIn.includes(filterBoardId)) return false;
    return matchFilter(l) && matchSearch(l);
  });
  const listEl  = document.getElementById('level-list');

  if (visible.length === 0) {
    if (filterBoardId !== null) {
      listEl.innerHTML = \`
        <div style="padding:20px;text-align:center;color:var(--muted);font-size:13px;line-height:1.6;">
          没有关卡使用棋盘模板 #\${filterBoardId}<br>
          <button onclick="clearBoardFilter()" style="margin-top:10px;padding:6px 12px;background:\${cfg.color};color:#111;border:none;border-radius:4px;cursor:pointer;font-weight:bold;font-family:'Inter',sans-serif;">清除筛选</button>
        </div>\`;
    } else {
      listEl.innerHTML = \`<div style="padding:20px;text-align:center;color:var(--muted);font-size:13px;">无匹配关卡</div>\`;
    }
    return;
  }

  listEl.innerHTML = visible.map(l => {
    const tmpl     = curBoardTemplates()[l.boardIn[0]];
    const maxLayer = tmpl ? getMaxLayer(tmpl) : '?';
    const isActive = l.id === curLevelId;

    const chips = l.item.slice(0,5).map(t =>
      \`<span class="mini-chip" style="background:\${ITEM_COLORS[t]||'#555'}">\${t}</span>\`
    ).join('') + (l.item.length > 5 ? \`<span class="mini-chip" style="background:#444">+\${l.item.length-5}</span>\` : '');

    return \`<div class="level-item \${isActive?'active-item':''}"
      style="\${isActive ? \`border-color:\${cfg.color}55;background:\${cfg.color}11\` : ''}"
      onclick="selectLevel(\${l.id})">
      <div class="lv-num" style="color:\${isActive?cfg.color:'var(--muted)'}">\${l.id}</div>
      <div class="lv-meta">
        <div class="lv-board">棋盘 #\${l.boardIn[0]||'—'}</div>
        <div class="lv-chips">\${chips}</div>
      </div>
      <div class="lv-badge">\${maxLayer}层</div>
    </div>\`;
  }).join('');

  // Sync active filter chip color
  const color = cfg.color;
  document.querySelectorAll('.chip.active').forEach(c => {
    c.style.background   = color;
    c.style.borderColor  = color;
    c.style.color        = '#111';
  });
}

function updateBoardFilterBanner() {
  const banner = document.getElementById('board-filter-banner');
  if (!banner) return;
  if (filterBoardId !== null) {
    banner.style.display = 'flex';
    document.getElementById('filtered-board-id').textContent = filterBoardId;
  } else {
    banner.style.display = 'none';
  }
}

function clearBoardFilter() {
  filterBoardId = null;
  updateBoardFilterBanner();
  const url = new URL(window.location.href);
  url.searchParams.delete('boardId');
  window.history.replaceState({}, '', url.toString());
  renderList();
}

// ── Select Level ───────────────────────────────────────
function selectLevel(id) {
  curLevelId = id;
  renderList();

  const level = curLevels().find(l => l.id === id);
  if (!level) return;
  const cfg      = curConfig();
  const proj     = curProject();
  const boardId  = level.boardIn[0];
  const tmpl     = curBoardTemplates()[boardId];
  const maxLayer = tmpl ? getMaxLayer(tmpl) : 0;
  const totalC   = tmpl ? countCards(tmpl)  : 0;
  const freeC    = tmpl ? countFree(tmpl)   : 0;
  const score    = calcScore(totalC, freeC, maxLayer, level.item.length);

  // Parse backSpawnPos
  let backSpawnArray = [];
  if (level.backSpawnPos) {
    backSpawnArray = String(level.backSpawnPos).split('|').map(s => {
      const parts = s.split(',').map(Number);
      return { x: parts[0], y: parts[1] };
    }).filter(p => !isNaN(p.x) && !isNaN(p.y));
  }

  // Header
  document.getElementById('preview-head').innerHTML = \`
    <div>
      <div class="preview-title">第 \${id} 关</div>
      <div class="preview-sub">\${proj.name} · \${cfg.label} · 棋盘 #\${boardId} <a href="level_editor.html?template=template_\${boardId}" target="_blank" style="color:#ffd32a; text-decoration:none; margin-left:8px; font-size:11px; border:1px solid #ffd32a44; padding:1px 5px; border-radius:4px; font-weight:bold; background:#ffd32a18; display:inline-flex; align-items:center; gap:2px; vertical-align:middle; transition:all 0.2s;">🛠️ 编辑棋盘</a> · \${maxLayer}层 · \${level.item.length}种棋牌</div>
    </div>
    <div class="tag-row">
      \${level.item.map(t=>\`<span class="tag" style="color:\${ITEM_COLORS[t]||'#aaa'};border-color:\${ITEM_COLORS[t]||'#aaa'}44;background:\${ITEM_COLORS[t]||'#555'}18">\${ITEM_LABELS[t]||t}</span>\`).join('')}
    </div>
  \`;

  // Body
  document.getElementById('preview-body').innerHTML = \`
    <div class="board-box">
      <div class="board-box-title">棋盘布局</div>
      <canvas id="bcanvas" width="270" height="340"></canvas>
      <div class="layer-legend" id="layer-legend"></div>
    </div>
    <div class="info-col">
      <div class="info-card">
        <div class="info-card-title">关卡参数</div>
        <div class="info-row"><span class="k">关卡编号</span><span class="v">#\${id}</span></div>
        <div class="info-row"><span class="k">所属项目</span><span class="v">\${proj.name}</span></div>
        <div class="info-row"><span class="k">配置文件</span><span class="v">\${cfg.label}</span></div>
        <div class="info-row"><span class="k">棋盘模板</span><span class="v">#\${boardId} <a href="level_editor.html?template=template_\${boardId}" target="_blank" style="color:#ffd32a; text-decoration:none; margin-left:6px; font-size:11px; border:1px solid #ffd32a33; padding:1px 5px; border-radius:3px; font-weight:normal; background:#ffd32a10;">编辑</a></span></div>
        <div class="info-row"><span class="k">最大层数</span><span class="v">\${maxLayer} 层</span></div>
        <div class="info-row"><span class="k">总牌数</span><span class="v">\${totalC} 张</span></div>
        <div class="info-row"><span class="k">初始可点牌</span><span class="v">\${freeC} 张</span></div>
        <div class="info-row"><span class="k">棋牌种类</span><span class="v">\${level.item.length} 种</span></div>
        \${backSpawnArray.length > 0 ? \`
        <div class="info-row"><span class="k" style="color:#ff4d4d;">背面牌数</span><span class="v" style="color:#ff4d4d; font-weight:bold;">\${backSpawnArray.length} 张</span></div>
        \` : ''}
        <div class="info-row"><span class="k">难度评分</span>
          <span class="v" style="color:\${scoreColor(score)}">\${score} — \${scoreLabel(score)}</span>
        </div>
      </div>
      <div class="info-card">
        <div class="info-card-title">棋牌类型 (\${level.item.length}种)</div>
        <div class="item-grid">
          \${level.item.map(t=>\`
            <div class="item-card" style="background:\${ITEM_COLORS[t]||'#555'}1a;border:1px solid \${ITEM_COLORS[t]||'#555'}33">
              <div class="item-dot" style="background:\${ITEM_COLORS[t]||'#555'}"></div>
              <span style="color:\${ITEM_COLORS[t]||'#ccc'}">\${ITEM_LABELS[t]||t}</span>
            </div>
          \`).join('')}
        </div>
      </div>
      \${level.initItem&&level.initItem.length ? \`
      <div class="info-card">
        <div class="info-card-title">必现棋牌</div>
        <div class="info-row"><span class="k">棋牌 ID</span><span class="v">\${level.initItem.join(', ')}</span></div>
        <div class="info-row"><span class="k">必现数量</span><span class="v">\${level.num} 张</span></div>
      </div>\` : ''}
    </div>
  \`;

  // Draw board
  if (tmpl) { drawBoard(tmpl, maxLayer, backSpawnArray); renderLegend(maxLayer); }
  else {
    const ctx = document.getElementById('bcanvas').getContext('2d');
    ctx.fillStyle='#1c1c24'; ctx.fillRect(0,0,270,340);
    ctx.fillStyle='#606078'; ctx.font='13px Inter'; ctx.textAlign='center';
    ctx.fillText('棋盘数据不可用', 135, 170);
  }
}

// ── Board Drawing ──────────────────────────────────────
function drawBoard(tmpl, maxLayer, backSpawnArray = []) {
  const canvas = document.getElementById('bcanvas');
  const ctx    = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#09090c'; ctx.fillRect(0,0,W,H);

  const layers  = tmpl.layers || {};
  const allTiles = [];
  for (let lay = 1; lay <= maxLayer; lay++) {
    (layers[lay]||[]).forEach(t => allTiles.push({...t, _lay: lay}));
  }
  if (!allTiles.length) return;

  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  allTiles.forEach(t => {
    const x = t.x??t[0], y = t.y??t[1];
    minX=Math.min(minX,x); maxX=Math.max(maxX,x);
    minY=Math.min(minY,y); maxY=Math.max(maxY,y);
  });
  const cols = maxX-minX+2, rows = maxY-minY+2;
  const tw   = Math.min(Math.floor((W-16)/cols), 22);
  const th   = tw;
  const ox   = Math.floor((W-cols*tw)/2);
  const oy   = Math.floor((H-rows*th)/2);

  for (let lay = 1; lay <= maxLayer; lay++) {
    const color = LAYER_COLORS[lay-1]||'#888';
    const sh    = lay * 1.2;
    (layers[lay]||[]).forEach(t => {
      const tx = t.x??t[0], ty = t.y??t[1];
      const px = ox+(tx-minX)*tw+sh, py = oy+(ty-minY)*th+sh;
      ctx.fillStyle='rgba(0,0,0,0.45)';
      ctx.fillRect(px+sh, py+sh, tw-2, th-2);
      ctx.fillStyle=color+'cc';
      ctx.fillRect(px, py, tw-2, th-2);
      
      ctx.fillStyle='rgba(255,255,255,0.13)';
      ctx.fillRect(px,py,tw-2,2); ctx.fillRect(px,py,2,th-2);
    });
  }

  // Draw backside cards on top of the highest layer at their coordinates
  backSpawnArray.forEach(bp => {
    let maxL = -1;
    for (let lay = maxLayer; lay >= 1; lay--) {
      const hasTile = (layers[lay]||[]).some(t => {
        const tx = t.x??t[0], ty = t.y??t[1];
        return tx === bp.x && ty === bp.y;
      });
      if (hasTile) {
        maxL = lay;
        break;
      }
    }
    if (maxL !== -1) {
      const sh = maxL * 1.2;
      const px = ox+(bp.x-minX)*tw+sh, py = oy+(bp.y-minY)*th+sh;
      ctx.strokeStyle = '#ff4d4d';
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 1, py + 1, tw - 4, th - 4);
      ctx.beginPath();
      ctx.moveTo(px + 3, py + 3);
      ctx.lineTo(px + tw - 5, py + th - 5);
      ctx.moveTo(px + tw - 5, py + 3);
      ctx.lineTo(px + 3, py + th - 5);
      ctx.stroke();
    }
  });

}

function renderLegend(maxLayer) {
  document.getElementById('layer-legend').innerHTML =
    Array.from({length:maxLayer},(_,i)=>\`
      <div class="legend-row">
        <div class="legend-dot" style="background:\${LAYER_COLORS[i]}"></div>
        第 \${i+1} 层
      </div>\`).join('');
}

// ── Helpers ────────────────────────────────────────────
function getMaxLayer(tmpl) {
  if (!tmpl?.layers) return 1;
  return Math.max(0,...Object.keys(tmpl.layers).map(Number).filter(n=>!isNaN(n)&&(tmpl.layers[n]||[]).length>0)) || 1;
}
function countCards(tmpl) {
  return Object.values(tmpl.layers||{}).reduce((s,a)=>s+(a?a.length:0),0);
}
function countFree(tmpl) { return (tmpl.layers?.[1]||[]).length; }
function calcScore(N,F,L,M) {
  if(!N||!F||!M) return 0;
  return Math.round((N/Math.max(F,1))*(1+0.15*L)*M);
}
function scoreLabel(s) { return s<50?'Easy 简单':s<90?'Medium 中等':'Hard 困难'; }
function scoreColor(s) { return s<50?'#0be881':s<90?'#ffd32a':'#ff3f34'; }

function renderEmpty() {
  document.getElementById('preview-head').innerHTML = \`
    <div>
      <div class="preview-title">选择一个关卡</div>
      <div class="preview-sub">点击左侧列表查看关卡详情</div>
    </div>\`;
  document.getElementById('preview-body').innerHTML = \`
    <div class="empty-state">
      <div class="empty-icon">🎮</div>
      <div style="font-size:15px;font-weight:600">选择左侧关卡开始预览</div>
    </div>\`;
}

// ── Boot ───────────────────────────────────────────────
buildTopbar();
updateBoardFilterBanner();
if (filterBoardId !== null) {
  const visible = curLevels().filter(l => l.boardIn.includes(filterBoardId));
  if (visible.length > 0) {
    selectLevel(visible[0].id);
  } else {
    renderList();
    renderEmpty();
  }
} else {
  renderList();
  renderEmpty();
}
</script>
</body>
</html>`;

fs.writeFileSync(OUTPUT_HTML, html, 'utf8');
console.log(`\n✅ 生成完成: ${OUTPUT_HTML}`);
allProjects.forEach(p => {
    p.levelConfigs.forEach(c => {
        console.log(`   [${p.name}] ${c.label}: ${c.levels.length} 关`);
    });
});
console.log(`   棋盘模板: ${Object.values(projectTemplates).reduce((sum, map) => sum + Object.keys(map).length, 0)} 套 (跨项目)\n`);
