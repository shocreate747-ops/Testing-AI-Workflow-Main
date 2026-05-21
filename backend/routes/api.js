const express = require('express');
const router  = express.Router();
const { getAllAnimations, updateAnimationField, FIELD_COL } = require('../services/googleSheets');

const BOOLEAN_FIELDS = [
  'spellCheck', 'sourcesVerified', 'fontsConsistency', 'colorConsistency',
  'understandability', 'realisticMidjourney', 'brollsAccuracy', 'timelySubmission',
];
const ALL_FIELDS = Object.keys(FIELD_COL);

router.get('/animations', async (_req, res) => {
  try {
    res.json({ animations: await getAllAnimations() });
  } catch (err) {
    console.error('[GET /api/animations]', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put('/animations/:id/field', async (req, res) => {
  try {
    const { id }           = req.params;
    const { field, value } = req.body;

    if (!ALL_FIELDS.includes(field)) {
      return res.status(400).json({ error: `field must be one of: ${ALL_FIELDS.join(', ')}` });
    }

    const coerced = BOOLEAN_FIELDS.includes(field) ? Boolean(value) : String(value);
    const updated = await updateAnimationField(id, field, coerced);
    console.log(`[field] animation=${id} field=${field} value=${coerced}`);
    res.json({ success: true, animation: updated });
  } catch (err) {
    console.error('[PUT /api/animations/:id/field]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
