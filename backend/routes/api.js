const express = require('express');
const router  = express.Router();
const { getAllAnimations, updateAnimationField, FIELD_COL, VALID_STATUSES } = require('../services/googleSheets');

const BOOLEAN_FIELDS = [
  'spellCheck', 'sourcesVerified', 'fontsConsistency', 'colorConsistency',
  'understandability', 'realisticMidjourney', 'brollsAccuracy', 'timelySubmission',
];
const ALL_FIELDS = Object.keys(FIELD_COL);

// Plugin + Apps Script poll this
// Accepts optional ?sheetId=<id> to override the env-var sheet
router.get('/animations', async (req, res) => {
  try {
    const sheetId = req.query.sheetId || null;
    res.json({ animations: await getAllAnimations(sheetId) });
  } catch (err) {
    console.error('[GET /api/animations]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Generic field update — used by plugin for editor, status, QC checks, etc.
// Accepts optional { sheetId } in body to override the env-var sheet
router.put('/animations/:id/field', async (req, res) => {
  try {
    const { id }                       = req.params;
    const { field, value, sheetId }    = req.body;

    if (!ALL_FIELDS.includes(field)) {
      return res.status(400).json({ error: `field must be one of: ${ALL_FIELDS.join(', ')}` });
    }
    if (field === 'status' && !VALID_STATUSES.includes(value)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const coerced = BOOLEAN_FIELDS.includes(field) ? Boolean(value) : String(value);
    const updated = await updateAnimationField(id, field, coerced, sheetId || null);
    console.log(`[field] animation=${id} ${field}=${coerced}`);
    res.json({ success: true, animation: updated });
  } catch (err) {
    console.error('[PUT /api/animations/:id/field]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Convenience endpoint called by Google Apps Script onEdit
router.post('/sync/from-sheets', async (req, res) => {
  try {
    const { animationNo, field, value, sheetId } = req.body;
    if (!animationNo || !field) {
      return res.status(400).json({ error: 'animationNo and field are required' });
    }
    const updated = await updateAnimationField(animationNo, field, value, sheetId || null);
    res.json({ success: true, animation: updated });
  } catch (err) {
    console.error('[POST /api/sync/from-sheets]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
