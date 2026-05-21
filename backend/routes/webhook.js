const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const { markUploaded } = require('../services/googleSheets');

const SECRET = process.env.FRAMEIO_WEBHOOK_SECRET;

function verifySignature(rawBody, header) {
  if (!SECRET) return true; // skip when not configured
  const expected = crypto.createHmac('sha256', SECRET).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(header));
  } catch { return false; }
}

// Frame.io fires this when a video is ready / uploaded
// Matches the asset name (without extension) to Animation No. in column A
router.post('/frameio', async (req, res) => {
  try {
    const sig = req.headers['x-frameio-signature'] || '';
    if (!verifySignature(req.rawBody, sig)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const eventType = req.body.type || req.body.event_type || '';
    if (!['asset.ready', 'asset.created', 'presentation.ready'].includes(eventType)) {
      return res.json({ message: 'Event not handled', eventType });
    }

    const asset = req.body.resource || req.body.data || {};

    // Derive review link — Frame.io surfaces it under different keys by API version
    const link = asset.share_url || asset.link || asset.short_url || null;
    if (!link) return res.json({ message: 'No shareable link in payload — skipping' });

    // Match asset name (strip extension) → Animation No. in column A
    const rawName    = asset.name || '';
    const animationNo = rawName.replace(/\.[^/.]+$/, '').trim(); // e.g. "A5.mp4" → "A5"
    if (!animationNo) return res.json({ message: 'Could not derive animationNo from asset name' });

    const updated = await markUploaded(animationNo, link);

    console.log(`[frame.io] ${animationNo} → Uploaded  link=${link}`);
    res.json({ success: true, animation: updated });
  } catch (err) {
    console.error('[frame.io webhook]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
