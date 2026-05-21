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

const CHECK_FIELDS = [
  { key: 'spellCheck',          label: 'Spell Check' },
  { key: 'sourcesVerified',     label: 'Sources Verified' },
  { key: 'fontsConsistency',    label: 'Fonts Consistency' },
  { key: 'colorConsistency',    label: 'Color Consistency' },
  { key: 'understandability',   label: 'Understandability' },
  { key: 'realisticMidjourney', label: 'Realistic MJ' },
  { key: 'brollsAccuracy',      label: 'Brolls Accuracy' },
  { key: 'timelySubmission',    label: 'Timely Submission' },
];

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
      `<p class="error-msg">Could not load animations.<br>${esc(err.message)}</p>`;
  }
}

function renderList(animations) {
  const container = document.getElementById('animation-list');
  if (!animations.length) {
    container.innerHTML = '<p class="placeholder">No animations found in the sheet.</p>';
    return;
  }
  container.innerHTML = animations.map(a => {
    const reviewerClass = a.reviewer === 'Not Reviewed' ? 'reviewer-badge not-reviewed' : 'reviewer-badge';
    return `
    <div class="animation-card">
      <div class="anim-header">
        <span class="anim-no">${esc(a.animationNo)}</span>
        <span class="anim-editor">${esc(a.editor)}</span>
        <span class="${reviewerClass}">${esc(a.reviewer)}</span>
      </div>
      <div class="checks-grid">
        ${CHECK_FIELDS.map(f => `
          <label class="check-item${a[f.key] ? ' checked' : ''}">
            <input type="checkbox" ${a[f.key] ? 'checked' : ''}
              onchange="updateField('${esc(a.animationNo)}', '${f.key}', this.checked)">
            ${f.label}
          </label>
        `).join('')}
      </div>
    </div>`;
  }).join('');
}

// ── Update field ──────────────────────────────────────────────────────────────

async function updateField(animationNo, field, value) {
  setSync('Updating…', 'syncing');
  try {
    const res = await fetch(
      `${API_BASE}/api/animations/${encodeURIComponent(animationNo)}/field`,
      {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ field, value }),
      }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setSync('Updated ✓', 'connected');
    setTimeout(fetchAnimations, 600);
  } catch (err) {
    setSync(`Update failed: ${err.message}`, 'error');
  }
}

// ── Boot ──────────────────────────────────────────────────────────────────────

document.getElementById('refreshBtn').addEventListener('click', fetchAnimations);

fetchAnimations();
setInterval(fetchAnimations, 30_000);
