const crypto = require('crypto');

const FRAMEIO_SECRET = process.env.FRAMEIO_WEBHOOK_SECRET;

function verifySignature(rawBody, signatureHeader) {
  if (!FRAMEIO_SECRET) return true; // skip verification when secret is not configured
  const expected = crypto
    .createHmac('sha256', FRAMEIO_SECRET)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}

function extractAssetInfo(payload) {
  const asset = payload.resource || payload.data || {};
  return {
    assetId:   asset.id,
    name:      asset.name,
    projectId: asset.project_id,
    // Frame.io may surface the link under different keys depending on API version
    link:      asset.share_url || asset.link || asset.short_url || null,
    type:      asset.type,
  };
}

module.exports = { verifySignature, extractAssetInfo };
