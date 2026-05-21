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
      <input
        class="editor-input"
        type="text"
        value="${esc(a.editor)}"
        placeholder="Assign editor…"
        data-id="${esc(a.animationNo)}"
        data-original="${esc(a.editor)}"
        onblur="commitEditor(this)"
        onkeydown="if(event.key==='Enter'){this.blur()}if(event.key==='Escape'){this.value=this.dataset.original;this.blur()}"
      />
    </div>
  `).join('');
}

// ── Commit editor change ──────────────────────────────────────────────────────

async function commitEditor(input) {
  const newVal  = input.value.trim();
  const original = input.dataset.original;
  if (newVal === original) return; // no change

  const animationNo = input.dataset.id;
  input.classList.add('saving');
  setSync('Updating…', 'syncing');

  try {
    const res = await fetch(
      `${API_BASE}/api/animations/${encodeURIComponent(animationNo)}/field`,
      {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ field: 'editor', value: newVal || 'Not Assigned' }),
      }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    input.dataset.original = newVal || 'Not Assigned';
    input.classList.remove('saving');
    input.classList.add('saved');
    setSync('Updated ✓', 'connected');
    setTimeout(() => input.classList.remove('saved'), 1500);
  } catch (err) {
    input.value = original; // revert on error
    input.classList.remove('saving');
    setSync(`Update failed: ${err.message}`, 'error');
  }
}

// ── Boot ──────────────────────────────────────────────────────────────────────

document.getElementById('refreshBtn').addEventListener('click', fetchAnimations);

fetchAnimations();
setInterval(fetchAnimations, 30_000);
