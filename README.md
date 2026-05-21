# Production Tracking Workflow

Automatic three-way sync between **Google Sheets**, an **Adobe CEP Plugin** (After Effects / Premiere Pro), and **Frame.io**.

---

## How it works

```
Google Sheets  ◄──────────────────────────────────►  Adobe Plugin (AE / Premiere)
      ▲                    (bidirectional)                        │
      │                                                           │ render complete
      │                                                     status → "Rendered"
      │
      │  Frame.io webhook (asset uploaded)
      └─── Frame.io link pasted into Sheet + status → "Uploaded"
```

| Trigger | What happens automatically |
|---|---|
| Change status in Google Sheets | Plugin reflects the new status within 30 s |
| Change status in the plugin | Google Sheet updates immediately |
| Render completes in After Effects | Both Sheet and plugin update to **Rendered** |
| Video uploaded to Frame.io | Sheet receives the review link + status → **Uploaded** |

**Status values:** `Pending` → `In Progress` → `Rendered` → `Uploaded`

---

## Repository structure

```
├── backend/                   Node.js API — the central sync hub
│   ├── server.js
│   ├── routes/
│   │   ├── api.js             GET /api/projects  |  PUT /api/projects/:id/status
│   │   └── webhook.js         POST /webhook/frameio
│   └── services/
│       ├── googleSheets.js    Google Sheets API helpers
│       └── frameio.js         Frame.io webhook signature verification
│
├── adobe-plugin/              CEP panel (After Effects + Premiere Pro)
│   ├── CSXS/manifest.xml      Extension manifest
│   ├── index.html
│   ├── css/style.css
│   ├── js/main.js             Panel UI logic
│   └── jsx/hostscript.jsx     ExtendScript (render queue detection)
│
├── google-apps-script/
│   └── Code.gs                Paste into Apps Script to watch Sheet edits
│
└── .github/workflows/
    ├── ci.yml                 Syntax-check the backend on every push
    └── deploy.yml             Deploy to Railway on push to main
```

---

## Setup — step by step

### 1  Google Sheets

1. Create a sheet with these columns in row 1:

   | A | B | C | D | E | F | G |
   |---|---|---|---|---|---|---|
   | Project ID | Project Name | Task | Status | Assigned To | Deadline | Review Link |

2. Go to [Google Cloud Console](https://console.cloud.google.com) → create a project → enable **Google Sheets API**.
3. Create a **Service Account** → download the JSON key.
4. Share your sheet with the service account's email address (give it **Editor** access).

---

### 2  Google Apps Script

1. In your sheet: **Extensions → Apps Script**.
2. Replace the default code with the contents of `google-apps-script/Code.gs`.
3. Set `BACKEND_URL` to your deployed backend URL (see step 4).
4. **Deploy → New deployment → Web app** (Execute as: *Me*, Access: *Anyone*).
5. Copy the Web App URL — you'll use it as the backend's callback target.
6. Add the edit trigger: **Triggers (clock icon) → Add trigger → `onEdit`, From spreadsheet, On edit**.

---

### 3  Backend

#### Local development

```bash
cd backend
cp ../.env.example .env   # fill in your values
npm install
npm run dev               # starts on http://localhost:3000
```

#### Deploy to Railway (recommended free tier)

1. Sign up at [railway.app](https://railway.app) and create a new project from this GitHub repo.
2. Set the **root directory** to `backend`.
3. Add environment variables in the Railway dashboard (copy from `.env.example`).
4. Copy the public URL Railway gives you — use it in `BACKEND_URL` in Apps Script and in `API_BASE` in `adobe-plugin/js/main.js`.
5. Add `RAILWAY_TOKEN` to your repo **Secrets** (Settings → Secrets → Actions) so the deploy workflow runs automatically.

---

### 4  Frame.io webhook

1. In Frame.io: go to **Developer → Webhooks → Create webhook**.
2. Set the URL to: `https://your-backend-url.com/webhook/frameio`
3. Subscribe to events: `asset.ready` and `asset.created`.
4. Copy the **signing secret** → put it in `FRAMEIO_WEBHOOK_SECRET`.
5. Make sure the **Frame.io project ID** in each asset's payload matches **column A** (Project ID) in your sheet.

---

### 5  Adobe CEP Plugin

1. Download `CSInterface.js` from [Adobe-CEP/CEP-Resources](https://github.com/Adobe-CEP/CEP-Resources/blob/master/CEP_11.x/CSInterface.js) and place it at `adobe-plugin/js/CSInterface.js`.
2. Edit `adobe-plugin/js/main.js` — set `API_BASE` to your backend URL.
3. Edit `adobe-plugin/CSXS/manifest.xml` — replace `com.yourstudio` with your own reverse-domain prefix.
4. Copy the `adobe-plugin/` folder to the CEP extensions directory:
   - **Mac:** `~/Library/Application Support/Adobe/CEP/extensions/`
   - **Windows:** `%APPDATA%\Adobe\CEP\extensions\`
5. Enable unsigned extensions (one-time):
   - Mac: `defaults write com.adobe.CSXS.11 PlayerDebugMode 1`
   - Windows: add registry key `HKCU\Software\Adobe\CSXS.11` → `PlayerDebugMode` = `1`
6. Launch After Effects or Premiere Pro → **Window → Extensions → Production Tracker**.

---

## Render → Sheet flow (After Effects)

The plugin's **Start Render** button triggers the After Effects render queue via ExtendScript. The panel polls every 5 seconds; when all queue items finish, it automatically calls `PUT /api/projects/:id/status` with `"Rendered"`, which updates column D in the sheet.

> **Project ID matching:** the project name in After Effects (without `.aep`) must match the value in column A of the sheet.

---

## Environment variables reference

| Variable | Description |
|---|---|
| `GOOGLE_SHEET_ID` | `1tmvW5StFGdPN-Yw-gZOWMlpCbYbqj2ydvkzlAFfFqYY` |
| `GOOGLE_SHEET_NAME` | Tab name (default: `Projects`) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Full JSON content of the service account key |
| `FRAMEIO_WEBHOOK_SECRET` | Signing secret from Frame.io webhook settings |
| `PORT` | Port for the backend server (default: `3000`) |
