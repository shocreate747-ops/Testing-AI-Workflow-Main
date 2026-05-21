// ExtendScript — runs inside After Effects / Premiere Pro
// Called by the CEP panel via csInterface.evalScript()

var renderInProgress = false;

/**
 * Starts the After Effects render queue and returns a status message.
 * In Premiere Pro the render queue concept differs; adapt as needed.
 */
function startRenderQueue() {
  if (typeof app === 'undefined' || typeof app.project === 'undefined') {
    return 'No project is open.';
  }

  // After Effects exposes app.project.renderQueue
  if (typeof app.project.renderQueue === 'undefined') {
    return 'Render queue not available in this host application.';
  }

  var rq = app.project.renderQueue;
  if (rq.numItems === 0) {
    return 'Render queue is empty — add a comp to the queue first.';
  }

  renderInProgress = true;
  rq.render();
  return 'Render started.';
}

/**
 * Returns a JSON string describing render state.
 * Returns the string "idle" when no render has been started.
 *
 * Shape when rendering:  { "done": false }
 * Shape when complete:   { "done": true, "project": "MyProject", "projectId": "MyProject" }
 */
function getRenderStatus() {
  if (!renderInProgress) return 'idle';

  if (typeof app.project.renderQueue === 'undefined') return 'idle';

  var rq      = app.project.renderQueue;
  var allDone = true;

  for (var i = 1; i <= rq.numItems; i++) {
    var s = rq.item(i).status;
    if (s === RQItemStatus.RENDERING || s === RQItemStatus.QUEUED) {
      allDone = false;
      break;
    }
  }

  if (allDone) {
    renderInProgress = false;
    // Use the project name (without extension) as the project ID to match column A in the Sheet
    var projectName = app.project.name.replace(/\.(aep|prproj)$/i, '');
    return JSON.stringify({ done: true, project: projectName, projectId: projectName });
  }

  return JSON.stringify({ done: false });
}

/**
 * Returns the currently open project's name (for display purposes).
 */
function getProjectName() {
  if (typeof app !== 'undefined' && typeof app.project !== 'undefined') {
    return app.project.name;
  }
  return '';
}
