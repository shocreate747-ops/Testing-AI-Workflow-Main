// Change this to your deployed backend URL once you deploy
const API_BASE = (window.API_BASE || 'http://localhost:3000').replace(/\/$/, '');

const csInterface = new CSInterface();

let renderPollTimer = null;

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function badgeClass(status) {
  return 'badge badge-' + status.replace(' ', '-');
}

// ── Project list ─────────────────────────────────────────────────────────────

async function fetchProjects() {
  setSync('Syncing…', 'syncing');
  try {
    const res  = await fetch(`${API_BASE}/api/projects`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderList(data.projects || []);
    setSync(`Synced — ${data.projects.length} project(s)`, 'connected');
  } catch (err) {
    setSync(`Error: ${err.message}`, 'error');
    document.getElementById('project-list').innerHTML =
      `<p class="error-msg">Could not load projects.<br>${esc(err.message)}</p>`;
  }
}

function renderList(projects) {
  const container = document.getElementById('project-list');
  if (!projects.length) {
    container.innerHTML = '<p class="placeholder">No projects found in the sheet.</p>';
    return;
  }
  container.innerHTML = projects.map(p => `
    <div class="project-card">
      <div class="project-name">${esc(p.name)}</div>
      <div class="project-task">${esc(p.task)}</div>
      <div class="card-row">
        <select class="status-select" data-id="${esc(p.id)}" onchange="changeStatus('${esc(p.id)}', this.value)">
          ${['Pending','In Progress','Rendered','Uploaded'].map(s =>
            `<option ${p.status === s ? 'selected' : ''}>${s}</option>`
          ).join('')}
        </select>
        <span class="${badgeClass(p.status)}">${esc(p.status)}</span>
      </div>
      ${p.frameioLink
        ? `<a class="frameio-link" href="${esc(p.frameioLink)}" title="${esc(p.frameioLink)}">▶ Frame.io — ${esc(p.name)}</a>`
        : ''}
    </div>
  `).join('');
}

// ── Status update ─────────────────────────────────────────────────────────────

async function changeStatus(projectId, newStatus) {
  setSync('Updating…', 'syncing');
  try {
    const res = await fetch(`${API_BASE}/api/projects/${encodeURIComponent(projectId)}/status`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: newStatus, source: 'adobe-plugin' }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setSync('Updated ✓', 'connected');
    // Refresh the list after a short delay so the badge updates
    setTimeout(fetchProjects, 600);
  } catch (err) {
    setSync(`Update failed: ${err.message}`, 'error');
  }
}

// ── After Effects render queue ────────────────────────────────────────────────

function startRender() {
  const btn = document.getElementById('renderBtn');
  btn.disabled = true;
  btn.textContent = 'Rendering…';
  document.getElementById('render-msg').textContent = 'Starting render queue…';

  csInterface.evalScript('startRenderQueue()', result => {
    if (result === 'EvalScript Error') {
      document.getElementById('render-msg').textContent = 'Error — check After Effects host script.';
      btn.disabled = false;
      btn.textContent = 'Start Render';
      return;
    }
    document.getElementById('render-msg').textContent = result;
    // Start polling for render completion every 5 s
    renderPollTimer = setInterval(pollRenderStatus, 5000);
  });
}

function pollRenderStatus() {
  csInterface.evalScript('getRenderStatus()', result => {
    if (!result || result === 'EvalScript Error' || result === 'idle') return;
    try {
      const info = JSON.parse(result);
      if (info.done) {
        clearInterval(renderPollTimer);
        onRenderComplete(info);
      }
    } catch { /* ignore mid-render parse noise */ }
  });
}

async function onRenderComplete(info) {
  document.getElementById('render-msg').textContent = `Render complete: ${info.project}`;
  document.getElementById('renderBtn').disabled = false;
  document.getElementById('renderBtn').textContent = 'Start Render';

  if (info.projectId) {
    await changeStatus(info.projectId, 'Rendered');
  }
}

// ── Boot ──────────────────────────────────────────────────────────────────────

document.getElementById('refreshBtn').addEventListener('click', fetchProjects);
document.getElementById('renderBtn').addEventListener('click', startRender);

fetchProjects();
setInterval(fetchProjects, 30_000); // passive refresh every 30 s
