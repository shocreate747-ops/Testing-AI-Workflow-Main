const express = require('express');
const router  = express.Router();

// Placeholder — no webhook integration needed for the QC review sheet.
// Add Frame.io or other webhook handlers here if required in the future.
router.post('/frameio', (_req, res) => {
  res.json({ message: 'Webhook endpoint reserved' });
});

module.exports = router;
