const express = require('express');
const router  = express.Router();
const { verifySignature, extractAssetInfo } = require('../services/frameio');
const { updateFrameioLink } = require('../services/googleSheets');

const HANDLED_EVENTS = new Set(['asset.ready', 'asset.created', 'presentation.ready']);

// Frame.io fires this when a video asset is uploaded / review link becomes available
router.post('/frameio', async (req, res) => {
  try {
    const signature = req.headers['x-frameio-signature'] || '';
    if (!verifySignature(req.rawBody, signature)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const eventType = req.body.type || req.body.event_type || '';
    if (!HANDLED_EVENTS.has(eventType)) {
      return res.json({ message: 'Event type not handled', eventType });
    }

    const asset = extractAssetInfo(req.body);
    if (!asset.link) {
      return res.json({ message: 'No shareable link in payload — skipping' });
    }

    // asset.projectId should match the Project ID in column A of your Sheet
    await updateFrameioLink(asset.projectId, asset.link);

    console.log(`[frame.io] project=${asset.projectId} link=${asset.link}`);
    res.json({ success: true, projectId: asset.projectId, link: asset.link });
  } catch (err) {
    console.error('[frame.io webhook]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
