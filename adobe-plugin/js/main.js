const API_BASE = (window.API_BASE || 'http://localhost:3000').replace(/\/$/, '');

const csInterface = new CSInterface();

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
      <span class="anim-editor">${esc(a.editor)}</span>
    </div>
  `).join('');
}

document.getElementById('refreshBtn').addEventListener('click', fetchAnimations);

fetchAnimations();
setInterval(fetchAnimations, 30_000);
