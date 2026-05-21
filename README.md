# QC Review Tracker

Bidirectional sync between **Google Sheets** and an **Adobe CEP Plugin** (After Effects / Premiere Pro) for animation quality-control reviews.

Sheet: `1tmvW5StFGdPN-Yw-gZOWMlpCbYbqj2ydvkzlAFfFqYY`

---

## Sheet structure

| A | B | C | D | E | F | G | H | I | J | K | L |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Animation No. | Editor | Spell Check | Sources Verified | Fonts Consistency | Color Consistency | Understandability | Realistic Midjourney | Brolls Accuracy | Timely Submission | Reviewer | Review Link |

- Columns C–J are booleans (`TRUE` / `FALSE`)
- Column L is a plain URL (paste the review link here)
- Column A is the unique key used to match rows (e.g. `A1`, `A2` …)

---

## How it works

```
Google Sheet  ◄──────────────────────────────────►  Adobe Plugin (AE / Premiere)
                        (bidirectional)
```

| Action | Result |
|---|---|
| Tick / untick a check in the Sheet | Plugin reflects the change within 30 s |
| Tick / untick a check in the plugin | Sheet updates immediately |
| Change Editor or Reviewer in either place | Syncs to the other side |

---

## Repository structure

```
├── backend/
│   ├── server.js
│   ├── routes/
│   │   ├── api.js          GET /api/animations  |  PUT /api/animations/:id/field
│   │   └── webhook.js      reserved
│   └── services/
│       ├── googleSheets.js  Sheets API helpers
│       └── frameio.js       (retained for future use)
│
├── adobe-plugin/
│   ├── CSXS/manifest.xml
│   ├── index.html
│   ├── css/style.css
│   └── js/main.js
│
├── google-apps-script/
│   └── Code.gs             Paste into Apps Script to watch Sheet edits
│
└── .github/workflows/
    ├── ci.yml
    └── deploy.yml
```

---

## Setup

### 1  Share the sheet with your service account

1. Go to [Google Cloud Console](https://console.cloud.google.com) → create a project → enable **Google Sheets API**.
2. Create a **Service Account** → download the JSON key.
3. Share the sheet (`1tmvW5StFGdPN-Yw-gZOWMlpCbYbqj2ydvkzlAFfFqYY`) with the service account email — give it **Editor** access.

### 2  Backend

```bash
cd backend
cp ../.env.example .env   # fill in GOOGLE_SERVICE_ACCOUNT_JSON and GOOGLE_SHEET_NAME
npm install
npm run dev               # http://localhost:3000
```

Set `GOOGLE_SHEET_NAME` to the exact tab name in your sheet (e.g. `Sheet1`).

### 3  Deploy to Railway

1. Create a new project from this repo at [railway.app](https://railway.app).
2. Set root directory to `backend`.
3. Add env vars from `.env.example` in the Railway dashboard.
4. Copy the public URL → use it as `BACKEND_URL` in `Code.gs` and `API_BASE` in `main.js`.

### 4  Google Apps Script

1. In your sheet: **Extensions → Apps Script**.
2. Paste `google-apps-script/Code.gs`, replacing all existing code.
3. Set `BACKEND_URL` and `SHEET_NAME` at the top of the file.
4. **Deploy → New deployment → Web app** (Execute as: *Me*, Access: *Anyone*).
5. Add trigger: **Triggers → Add trigger → `onEdit`, From spreadsheet, On edit**.

### 5  Adobe CEP Plugin

1. Download `CSInterface.js` from [Adobe-CEP/CEP-Resources](https://github.com/Adobe-CEP/CEP-Resources/blob/master/CEP_11.x/CSInterface.js) → place at `adobe-plugin/js/CSInterface.js`.
2. Set `API_BASE` in `adobe-plugin/js/main.js` to your backend URL.
3. Copy `adobe-plugin/` to the CEP extensions folder:
   - **Mac:** `~/Library/Application Support/Adobe/CEP/extensions/`
   - **Windows:** `%APPDATA%\Adobe\CEP\extensions\`
4. Enable unsigned extensions (one-time):
   - Mac: `defaults write com.adobe.CSXS.11 PlayerDebugMode 1`
   - Windows: registry key `HKCU\Software\Adobe\CSXS.11` → `PlayerDebugMode = 1`
5. Launch After Effects or Premiere Pro → **Window → Extensions → QC Review Tracker**.

---

## Environment variables

| Variable | Value |
|---|---|
| `GOOGLE_SHEET_ID` | `1tmvW5StFGdPN-Yw-gZOWMlpCbYbqj2ydvkzlAFfFqYY` |
| `GOOGLE_SHEET_NAME` | Your tab name (e.g. `Sheet1`) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Full JSON of the service account key |
| `FRAMEIO_WEBHOOK_SECRET` | Reserved — not used currently |
| `PORT` | Backend port (default: `3000`) |
