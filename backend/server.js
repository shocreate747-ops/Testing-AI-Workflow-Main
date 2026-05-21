require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({ origin: '*' }));

// Capture raw body on webhook routes for signature verification; parse JSON elsewhere
app.use((req, res, next) => {
  if (req.path.startsWith('/webhook')) {
    let raw = '';
    req.on('data', chunk => (raw += chunk));
    req.on('end', () => {
      req.rawBody = raw;
      try { req.body = JSON.parse(raw || '{}'); } catch { req.body = {}; }
      next();
    });
  } else {
    express.json()(req, res, next);
  }
});

app.use('/webhook', require('./routes/webhook'));
app.use('/api', require('./routes/api'));

// Serve plugin assets so the panel auto-updates without reinstall
app.use('/plugin', require('express').static(require('path').join(__dirname, '../adobe-plugin'), {
  setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache'),
}));

app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Workflow sync server listening on port ${PORT}`));
