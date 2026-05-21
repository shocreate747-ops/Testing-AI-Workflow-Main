const express = require('express');
const router  = express.Router();
const { getAllProjects, updateProjectStatus } = require('../services/googleSheets');

const VALID_STATUSES = ['Pending', 'In Progress', 'Rendered', 'Uploaded'];

// Adobe plugin polls this to display current project list
router.get('/projects', async (_req, res) => {
  try {
    res.json({ projects: await getAllProjects() });
  } catch (err) {
    console.error('[GET /api/projects]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Called by Adobe plugin OR Google Apps Script when a status changes
router.put('/projects/:id/status', async (req, res) => {
  try {
    const { id }            = req.params;
    const { status, source } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const updated = await updateProjectStatus(id, status);
    console.log(`[status] project=${id} status="${status}" source=${source || 'unknown'}`);
    res.json({ success: true, project: updated });
  } catch (err) {
    console.error('[PUT /api/projects/:id/status]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Convenience alias called by Google Apps Script's onEdit trigger
router.post('/sync/from-sheets', async (req, res) => {
  try {
    const { projectId, status } = req.body;
    if (!projectId || !status) {
      return res.status(400).json({ error: 'projectId and status are required' });
    }
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status: ${status}` });
    }
    const updated = await updateProjectStatus(projectId, status);
    res.json({ success: true, project: updated });
  } catch (err) {
    console.error('[POST /api/sync/from-sheets]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
