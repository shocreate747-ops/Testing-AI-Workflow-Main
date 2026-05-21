const API_BASE = (window.API_BASE || 'http://localhost:3000').replace(/\/$/, '');
const csInterface = new CSInterface();

// ── Config ────────────────────────────────────────────────────────────────────

const STATUSES = ['Pending', 'In Progress', 'Rendered', 'Uploaded'];

const STATUS_STYLE = {
  'Pending':     { bg: '#2a2a2a', color: '#777777' },
  'In Progress': { bg: '#1e2d3d', color: '#7aafd4' },
  'Rendered':    { bg: '#1e3028', color: '#6dbf8a' },
  'Uploaded':    { bg: '#2a1e3d', color: '#a07adf' },
};

const PEOPLE = [
  { name: 'Rahul',    bg: '#253328', color: '#8aab90' },
  { name: 'Suraj',    bg: '#1e2e3d', color: '#7a9db8' },
  { name: 'Harshil',  bg: '#2e2e2e', color: '#999999' },
  { name: 'Shoyeb',   bg: '#352d1a', color: '#b09a6a' },
  { name: 'Chandu',   bg: '#352030', color: '#a87890' },
  { name: 'Yash',     bg: '#263320', color: '#8aaa78' },
  { name: 'Rushabh',  bg: '#1e2535', color: '#7888aa' },
  { name: 'Meet',     bg: '#1e3030', color: '#6a9898' },
  { name: 'Bilal',    bg: '#2c2038', color: '#9878b8' },
  { name: 'Saurabh',  bg: '#352818', color: '#aa8860' },
  { name: 'Bhanu',    bg: '#382020', color: '#aa7070' },
  { name: 'Prashant', bg: '#352820', color: '#a88070' },
];

const ASSIGN_OPTIONS = [
  ...PEOPLE,
  { name: 'Not Assigned', bg: '#2e2020', color: '#886060' },
];

function editorStyle(name) {
  const e = ASSIGN_OPTIONS.find(e => e.name === name) || { bg: '#2a2a2a', color: '#888' };
  return `background:${e.bg};color:${e.color}`;
}
function statusStyle(s) {
  const st = STATUS_STYLE[s] || STATUS_STYLE['Pending'];
  return `background:${st.bg};color:${st.color}`;
}

// ── Sheet ID (stored in localStorage) ────────────────────────────────────────

function extractSheetId(input) {
  const trimmed = input.trim();
  // Full URL pattern: /spreadsheets/d/<id>/
  const m = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  // If it looks like a bare ID (no slashes, typical length)
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

function getSheetId() {
  return localStorage.getItem('qc_sheet_id') || '';
}

function saveSheetId(id) {
  if (id) localStorage.setItem('qc_sheet_id', id);
  else     localStorage.removeItem('qc_sheet_id');
}

function sheetParam() {
  const id = getSheetId();
  return id ? `?sheetId=${encodeURIComponent(id)}` : '';
}

// ── Settings panel ────────────────────────────────────────────────────────────

const settingsBtn   = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settings-panel');
const sheetUrlInput = document.getElementById('sheet-url-input');
const sheetUrlSave  = document.getElementById('sheet-url-save');
const sheetUrlStatus = document.getElementById('sheet-url-status');

// Restore saved URL display on load
(function initSettings() {
  const saved = getSheetId();
  if (saved) {
    sheetUrlInput.value = saved;
    sheetUrlStatus.textContent = 'Sheet linked ✓';
    sheetUrlStatus.className = 'ok';
  }
})();

settingsBtn.addEventListener('click', () => {
  const hidden = settingsPanel.classList.toggle('hidden');
  settingsBtn.classList.toggle('active', !hidden);
});

sheetUrlSave.addEventListener('click', () => {
  const id = extractSheetId(sheetUrlInput.value);
  if (!id) {
    sheetUrlStatus.textContent = 'Invalid URL or ID — paste the full Google Sheet URL.';
    sheetUrlStatus.className = 'err';
    return;
  }
  saveSheetId(id);
  sheetUrlInput.value = id;
  sheetUrlStatus.textContent = 'Saved — fetching sheet…';
  sheetUrlStatus.className = 'ok';
  settingsPanel.classList.add('hidden');
  settingsBtn.classList.remove('active');
  fetchAnimations();
});

// ── State ─────────────────────────────────────────────────────────────────────
let allAnimations = [];
let activeFilter  = null;
let renderPollTimer = null;

// ── Helpers ───────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function setSync(msg, cls) {
  const el = document.getElementById('sync-label');
  el.textContent = msg;
  el.className   = cls || '';
}

// ── Filter bar ────────────────────────────────────────────────────────────────
const filterInput    = document.getElementById('filter-input');
const filterDropdown = document.getElementById('filter-dropdown');
const filterClear    = document.getElementById('filter-clear');

function buildFilterDropdown(query) {
  const q = query.trim().toLowerCase();
  const matches = PEOPLE.filter(p => !q || p.name.toLowerCase().includes(q));
  filterDropdown.innerHTML = '';

  if (!q) {
    const all = document.createElement('button');
    all.className   = 'fd-item fd-all' + (!activeFilter ? ' active' : '');
    all.textContent = 'All editors';
    all.onclick     = () => setFilter(null);
    filterDropdown.appendChild(all);
  }
  matches.forEach(p => {
    const btn = document.createElement('button');
    btn.className     = 'fd-item' + (activeFilter === p.name ? ' active' : '');
    btn.style.cssText = `background:${p.bg};color:${p.color}`;
    btn.textContent   = p.name;
    btn.onclick       = () => setFilter(p.name);
    filterDropdown.appendChild(btn);
  });
  filterDropdown.classList.toggle('hidden', matches.length === 0 && q !== '');
}

function setFilter(name) {
  activeFilter = name;
  filterInput.value = name || '';
  filterDropdown.classList.add('hidden');
  filterClear.style.display = name ? 'flex' : 'none';
  renderList(allAnimations);
  const shown = name ? allAnimations.filter(a => a.editor === name) : allAnimations;
  setSync(name ? `${name} — ${shown.length} animation(s)` : `Synced — ${allAnimations.length} animation(s)`, 'connected');
}

filterInput.addEventListener('focus', () => { buildFilterDropdown(filterInput.value); filterDropdown.classList.remove('hidden'); });
filterInput.addEventListener('input', () => { buildFilterDropdown(filterInput.value); filterDropdown.classList.remove('hidden'); });
filterClear.addEventListener('click', () => setFilter(null));
document.addEventListener('click', e => {
  if (!e.target.closest('#filter-bar')) filterDropdown.classList.add('hidden');
});

// ── Fetch & render ────────────────────────────────────────────────────────────
async function fetchAnimations() {
  setSync('Syncing…', 'syncing');
  try {
    const res  = await fetch(`${API_BASE}/api/animations${sheetParam()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    allAnimations = data.animations || [];
    renderList(allAnimations);
    const shown = activeFilter ? allAnimations.filter(a => a.editor === activeFilter) : allAnimations;
    setSync(activeFilter ? `${activeFilter} — ${shown.length}` : `Synced — ${allAnimations.length} animation(s)`, 'connected');
  } catch (err) {
    setSync(`Error: ${err.message}`, 'error');
    document.getElementById('animation-list').innerHTML =
      `<p class="error-msg">Could not load.<br>${esc(err.message)}</p>`;
  }
}

function renderList(animations) {
  const visible = activeFilter ? animations.filter(a => a.editor === activeFilter) : animations;
  const container = document.getElementById('animation-list');
  if (!visible.length) {
    container.innerHTML = `<p class="placeholder">${activeFilter ? `No animations for ${activeFilter}.` : 'No animations found.'}</p>`;
    return;
  }
  container.innerHTML = visible.map(a => `
    <div class="animation-card">
      <div class="card-top">
        <span class="anim-no">${esc(a.animationNo)}</span>
        <button class="editor-pill" style="${editorStyle(a.editor)}"
          onclick="toggleAssignDropdown(this,'${esc(a.animationNo)}','${esc(a.editor)}')"
        >${esc(a.editor)} ▾</button>
        <button class="status-pill" style="${statusStyle(a.status)}"
          onclick="toggleStatusDropdown(this,'${esc(a.animationNo)}','${esc(a.status)}')"
        >${esc(a.status)} ▾</button>
      </div>
      ${a.reviewLink ? `<a class="review-link" href="${esc(a.reviewLink)}" title="Open review">▶ Review Link</a>` : ''}
    </div>
  `).join('');
}

// ── Status dropdown ───────────────────────────────────────────────────────────
let openStatusDD = null;

function closeStatus() { if (openStatusDD) { openStatusDD.remove(); openStatusDD = null; } }

function toggleStatusDropdown(btn, animationNo, current) {
  if (openStatusDD) { const was = openStatusDD.dataset.for === animationNo; closeStatus(); if (was) return; }
  closeAssign();
  const rect = btn.getBoundingClientRect();
  const dd   = document.createElement('div');
  dd.className = 'status-dropdown'; dd.dataset.for = animationNo;
  STATUSES.forEach(s => {
    const item = document.createElement('button');
    item.className = 'sd-item' + (s === current ? ' active' : '');
    item.style.cssText = statusStyle(s);
    item.textContent = s;
    item.onclick = () => { updateStatus(animationNo, s, btn); closeStatus(); };
    dd.appendChild(item);
  });
  dd.style.top  = (rect.bottom + window.scrollY + 4) + 'px';
  dd.style.left = (rect.left  + window.scrollX)      + 'px';
  document.body.appendChild(dd); openStatusDD = dd;
}

document.addEventListener('click', e => {
  if (openStatusDD && !openStatusDD.contains(e.target) && !e.target.classList.contains('status-pill')) closeStatus();
});

async function updateStatus(animationNo, status, btn) {
  btn.textContent   = status + ' ▾';
  btn.style.cssText = statusStyle(status);
  const anim = allAnimations.find(a => a.animationNo === animationNo);
  if (anim) anim.status = status;
  await updateField(animationNo, 'status', status);
}

// ── Assign dropdown ───────────────────────────────────────────────────────────
let openAssignDD = null;

function closeAssign() { if (openAssignDD) { openAssignDD.remove(); openAssignDD = null; } }

function toggleAssignDropdown(btn, animationNo, current) {
  if (openAssignDD) { const was = openAssignDD.dataset.for === animationNo; closeAssign(); if (was) return; }
  closeStatus();
  const rect = btn.getBoundingClientRect();
  const dd   = document.createElement('div');
  dd.className = 'editor-dropdown'; dd.dataset.for = animationNo;
  ASSIGN_OPTIONS.forEach(e => {
    const item = document.createElement('button');
    item.className = 'dd-item' + (e.name === current ? ' active' : '');
    item.style.cssText = `background:${e.bg};color:${e.color}`;
    item.textContent = e.name;
    item.onclick = () => { assignEditor(animationNo, e.name, btn); closeAssign(); };
    dd.appendChild(item);
  });
  dd.style.top  = (rect.bottom + window.scrollY + 4) + 'px';
  dd.style.left = (rect.left  + window.scrollX)      + 'px';
  document.body.appendChild(dd); openAssignDD = dd;
}

document.addEventListener('click', e => {
  if (openAssignDD && !openAssignDD.contains(e.target) && !e.target.classList.contains('editor-pill')) closeAssign();
});

async function assignEditor(animationNo, editorName, pill) {
  pill.textContent   = editorName + ' ▾';
  pill.style.cssText = editorStyle(editorName);
  const anim = allAnimations.find(a => a.animationNo === animationNo);
  if (anim) anim.editor = editorName;
  renderList(allAnimations);
  await updateField(animationNo, 'editor', editorName);
}

// ── Generic field update ──────────────────────────────────────────────────────
async function updateField(animationNo, field, value) {
  setSync('Updating…', 'syncing');
  try {
    const body = { field, value };
    const id = getSheetId();
    if (id) body.sheetId = id;

    const res = await fetch(
      `${API_BASE}/api/animations/${encodeURIComponent(animationNo)}/field`,
      { method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body) }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setSync('Updated ✓', 'connected');
  } catch (err) {
    setSync(`Update failed: ${err.message}`, 'error');
    setTimeout(fetchAnimations, 500);
  }
}

// ── After Effects render queue ────────────────────────────────────────────────
function startRender() {
  const btn = document.getElementById('renderBtn');
  btn.disabled = true; btn.textContent = 'Rendering…';
  document.getElementById('render-msg').textContent = 'Starting render queue…';

  csInterface.evalScript('startRenderQueue()', result => {
    if (result === 'EvalScript Error') {
      document.getElementById('render-msg').textContent = 'Error — check host script.';
      btn.disabled = false; btn.textContent = 'Start Render'; return;
    }
    document.getElementById('render-msg').textContent = result;
    renderPollTimer = setInterval(pollRender, 5000);
  });
}

function pollRender() {
  csInterface.evalScript('getRenderStatus()', result => {
    if (!result || result === 'EvalScript Error' || result === 'idle') return;
    try {
      const info = JSON.parse(result);
      if (info.done) { clearInterval(renderPollTimer); onRenderDone(info); }
    } catch { /* mid-render noise */ }
  });
}

async function onRenderDone(info) {
  document.getElementById('render-msg').textContent = `Done: ${info.project}`;
  const btn = document.getElementById('renderBtn');
  btn.disabled = false; btn.textContent = 'Start Render';

  if (info.projectId) {
    const anim = allAnimations.find(a => a.animationNo === info.projectId);
    if (anim) {
      await updateField(info.projectId, 'status', 'Rendered');
      anim.status = 'Rendered';
      renderList(allAnimations);
    }
  }
}

// ── Boot ──────────────────────────────────────────────────────────────────────
document.getElementById('refreshBtn').addEventListener('click', fetchAnimations);
document.getElementById('renderBtn').addEventListener('click', startRender);
filterClear.style.display = 'none';
fetchAnimations();
setInterval(fetchAnimations, 30_000);
