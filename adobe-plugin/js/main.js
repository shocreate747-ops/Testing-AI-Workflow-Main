const API_BASE = (window.API_BASE || 'http://localhost:3000').replace(/\/$/, '');
const csInterface = new CSInterface();

// ── Editor roster (people only — no statuses) ─────────────────────────────────
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

// Full assign dropdown also includes these non-person states
const ASSIGN_OPTIONS = [
  ...PEOPLE,
  { name: 'Not Assigned', bg: '#2e2020', color: '#886060' },
  { name: 'In Progress',  bg: '#252525', color: '#808080' },
  { name: 'Rendered',     bg: '#202020', color: '#606060' },
];

function editorStyle(name) {
  const e = ASSIGN_OPTIONS.find(e => e.name === name) || { bg: '#2a2a2a', color: '#888' };
  return `background:${e.bg};color:${e.color}`;
}

// ── State ─────────────────────────────────────────────────────────────────────
let allAnimations = [];
let activeFilter  = null; // null = show all

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
    btn.className       = 'fd-item' + (activeFilter === p.name ? ' active' : '');
    btn.style.cssText   = `background:${p.bg};color:${p.color}`;
    btn.textContent     = p.name;
    btn.onclick         = () => setFilter(p.name);
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
  if (name) {
    const count = allAnimations.filter(a => a.editor === name).length;
    setSync(`${name} — ${count} animation(s)`, 'connected');
  } else {
    setSync(`Synced — ${allAnimations.length} animation(s)`, 'connected');
  }
}

filterInput.addEventListener('focus', () => {
  buildFilterDropdown(filterInput.value);
  filterDropdown.classList.remove('hidden');
});
filterInput.addEventListener('input', () => {
  buildFilterDropdown(filterInput.value);
  filterDropdown.classList.remove('hidden');
});
filterClear.addEventListener('click', () => setFilter(null));
document.addEventListener('click', e => {
  if (!e.target.closest('#filter-bar')) filterDropdown.classList.add('hidden');
});

// ── Fetch & render ────────────────────────────────────────────────────────────
async function fetchAnimations() {
  setSync('Syncing…', 'syncing');
  try {
    const res  = await fetch(`${API_BASE}/api/animations`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    allAnimations = data.animations || [];
    renderList(allAnimations);
    const label = activeFilter
      ? `${activeFilter} — ${allAnimations.filter(a => a.editor === activeFilter).length} animation(s)`
      : `Synced — ${allAnimations.length} animation(s)`;
    setSync(label, 'connected');
  } catch (err) {
    setSync(`Error: ${err.message}`, 'error');
    document.getElementById('animation-list').innerHTML =
      `<p class="error-msg">Could not load.<br>${esc(err.message)}</p>`;
  }
}

function renderList(animations) {
  const visible = activeFilter
    ? animations.filter(a => a.editor === activeFilter)
    : animations;

  const container = document.getElementById('animation-list');
  if (!visible.length) {
    container.innerHTML = `<p class="placeholder">${activeFilter
      ? `No animations assigned to ${activeFilter}.`
      : 'No animations found.'}</p>`;
    return;
  }
  container.innerHTML = visible.map(a => `
    <div class="animation-card">
      <span class="anim-no">${esc(a.animationNo)}</span>
      <button class="editor-pill" style="${editorStyle(a.editor)}"
        onclick="toggleAssignDropdown(this,'${esc(a.animationNo)}','${esc(a.editor)}')"
      >${esc(a.editor)} ▾</button>
    </div>
  `).join('');
}

// ── Assign dropdown ───────────────────────────────────────────────────────────
let openAssignDD = null;

function closeAssign() {
  if (openAssignDD) { openAssignDD.remove(); openAssignDD = null; }
}

function toggleAssignDropdown(btn, animationNo, current) {
  if (openAssignDD) {
    const wasThis = openAssignDD.dataset.for === animationNo;
    closeAssign();
    if (wasThis) return;
  }
  const rect = btn.getBoundingClientRect();
  const dd   = document.createElement('div');
  dd.className   = 'editor-dropdown';
  dd.dataset.for = animationNo;

  ASSIGN_OPTIONS.forEach(e => {
    const item = document.createElement('button');
    item.className     = 'dd-item' + (e.name === current ? ' active' : '');
    item.style.cssText = `background:${e.bg};color:${e.color}`;
    item.textContent   = e.name;
    item.onclick       = () => { assignEditor(animationNo, e.name, btn); closeAssign(); };
    dd.appendChild(item);
  });

  dd.style.top  = (rect.bottom + window.scrollY + 4) + 'px';
  dd.style.left = (rect.left  + window.scrollX)      + 'px';
  document.body.appendChild(dd);
  openAssignDD = dd;
}

document.addEventListener('click', e => {
  if (openAssignDD && !openAssignDD.contains(e.target) && !e.target.classList.contains('editor-pill'))
    closeAssign();
});

async function assignEditor(animationNo, editorName, pill) {
  pill.textContent   = editorName + ' ▾';
  pill.style.cssText = editorStyle(editorName);

  const anim = allAnimations.find(a => a.animationNo === animationNo);
  if (anim) anim.editor = editorName;

  setSync('Updating…', 'syncing');
  try {
    const res = await fetch(
      `${API_BASE}/api/animations/${encodeURIComponent(animationNo)}/field`,
      { method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'editor', value: editorName }) }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setSync('Updated ✓', 'connected');
    // re-render so filter view updates if needed
    renderList(allAnimations);
  } catch (err) {
    setSync(`Update failed: ${err.message}`, 'error');
    setTimeout(fetchAnimations, 500);
  }
}

// ── Boot ──────────────────────────────────────────────────────────────────────
document.getElementById('refreshBtn').addEventListener('click', fetchAnimations);
filterClear.style.display = 'none';
fetchAnimations();
setInterval(fetchAnimations, 30_000);
