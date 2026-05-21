const API_BASE = (window.API_BASE || 'http://localhost:3000').replace(/\/$/, '');

const csInterface = new CSInterface();

// ── Editor roster with colours ────────────────────────────────────────────────
const EDITORS = [
  { name: 'Rahul',        bg: '#2d5a3d', color: '#7edb9a' },
  { name: 'Suraj',        bg: '#1a3d5c', color: '#7ec8ff' },
  { name: 'Harshil',      bg: '#3a3a3a', color: '#d8d8d8' },
  { name: 'Shoyeb',       bg: '#5a4200', color: '#ffd166' },
  { name: 'Chandu',       bg: '#5a1a3a', color: '#ff9ece' },
  { name: 'Yash',         bg: '#2a5a1a', color: '#a8e06a' },
  { name: 'Rushabh',      bg: '#1a2a5a', color: '#8ab4ff' },
  { name: 'Meet',         bg: '#1a4a4a', color: '#6fe0d8' },
  { name: 'Bilal',        bg: '#3d1a5a', color: '#c07aff' },
  { name: 'Saurabh',      bg: '#5a3000', color: '#ffaa55' },
  { name: 'Bhanu',        bg: '#5a1a1a', color: '#ff8080' },
  { name: 'Prashant',     bg: '#5a2a1a', color: '#ffaa88' },
  { name: 'Not Assigned', bg: '#6b0000', color: '#ff6b6b' },
  { name: 'In Progress',  bg: '#333333', color: '#bbbbbb' },
  { name: 'Rendered',     bg: '#1a1a1a', color: '#888888' },
];

function editorStyle(name) {
  const e = EDITORS.find(e => e.name === name) || { bg: '#333', color: '#aaa' };
  return `background:${e.bg};color:${e.color}`;
}

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

let openDropdown = null;

function closeAll() {
  if (openDropdown) { openDropdown.remove(); openDropdown = null; }
}

// ── Fetch & render ────────────────────────────────────────────────────────────
async function fetchAnimations() {
  setSync('Syncing…', 'syncing');
  try {
    const res  = await fetch(`${API_BASE}/api/animations`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderList(data.animations || []);
    setSync(`Synced — ${data.animations.length} animation(s)`, 'connected');
  } catch (err) {
    setSync(`Error: ${err.message}`, 'error');
    document.getElementById('animation-list').innerHTML =
      `<p class="error-msg">Could not load.<br>${esc(err.message)}</p>`;
  }
}

function renderList(animations) {
  const container = document.getElementById('animation-list');
  if (!animations.length) {
    container.innerHTML = '<p class="placeholder">No animations found.</p>';
    return;
  }
  container.innerHTML = animations.map(a => `
    <div class="animation-card">
      <span class="anim-no">${esc(a.animationNo)}</span>
      <button
        class="editor-pill"
        style="${editorStyle(a.editor)}"
        onclick="toggleDropdown(this, '${esc(a.animationNo)}', '${esc(a.editor)}')"
      >${esc(a.editor)} ▾</button>
    </div>
  `).join('');
}

// ── Dropdown ──────────────────────────────────────────────────────────────────
function toggleDropdown(btn, animationNo, current) {
  if (openDropdown) {
    const wasThis = openDropdown.dataset.for === animationNo;
    closeAll();
    if (wasThis) return;
  }

  const rect = btn.getBoundingClientRect();
  const dd   = document.createElement('div');
  dd.className    = 'editor-dropdown';
  dd.dataset.for  = animationNo;

  EDITORS.forEach(e => {
    const item = document.createElement('button');
    item.className = 'dd-item' + (e.name === current ? ' active' : '');
    item.style.cssText = `background:${e.bg};color:${e.color}`;
    item.textContent   = e.name;
    item.onclick = () => { assignEditor(animationNo, e.name, btn); closeAll(); };
    dd.appendChild(item);
  });

  // position below the pill
  dd.style.top  = (rect.bottom + window.scrollY + 4) + 'px';
  dd.style.left = (rect.left + window.scrollX) + 'px';

  document.body.appendChild(dd);
  openDropdown = dd;
}

document.addEventListener('click', e => {
  if (openDropdown && !openDropdown.contains(e.target) && !e.target.classList.contains('editor-pill')) {
    closeAll();
  }
});

// ── Assign editor ─────────────────────────────────────────────────────────────
async function assignEditor(animationNo, editorName, pill) {
  pill.textContent = editorName + ' ▾';
  pill.style.cssText = editorStyle(editorName);
  setSync('Updating…', 'syncing');
  try {
    const res = await fetch(
      `${API_BASE}/api/animations/${encodeURIComponent(animationNo)}/field`,
      {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ field: 'editor', value: editorName }),
      }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setSync('Updated ✓', 'connected');
  } catch (err) {
    setSync(`Update failed: ${err.message}`, 'error');
    setTimeout(fetchAnimations, 500); // revert on error
  }
}

// ── Boot ──────────────────────────────────────────────────────────────────────
document.getElementById('refreshBtn').addEventListener('click', fetchAnimations);
fetchAnimations();
setInterval(fetchAnimations, 30_000);
