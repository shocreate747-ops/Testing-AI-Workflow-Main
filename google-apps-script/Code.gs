// ─────────────────────────────────────────────────────────────────────────────
// Production Tracker — Google Apps Script
//
// HOW TO DEPLOY
// 1. Open your Google Sheet → Extensions → Apps Script
// 2. Paste this entire file, replacing any existing code
// 3. Set BACKEND_URL below to your deployed backend address
// 4. Click Deploy → New deployment → Web app
//    • Execute as: Me
//    • Who has access: Anyone
// 5. Copy the Web App URL — you will need it for the Frame.io → Sheet push
// 6. Add the onEdit trigger:
//    Triggers (clock icon) → Add trigger → onEdit, From spreadsheet, On edit
// ─────────────────────────────────────────────────────────────────────────────

var BACKEND_URL  = 'https://your-backend-url.com'; // ← change this
var SHEET_NAME   = 'Projects';
var STATUS_COL   = 4; // column D (1-indexed)
var PROJECT_ID_COL = 1; // column A

// ── Trigger: fires when any cell is edited ────────────────────────────────────
function onEdit(e) {
  var sheet = e.source.getActiveSheet();
  if (sheet.getName() !== SHEET_NAME) return;

  var col = e.range.getColumn();
  var row = e.range.getRow();

  // Only react to status column edits; ignore the header row
  if (col !== STATUS_COL || row < 2) return;

  var newStatus  = e.range.getValue();
  var validStatuses = ['Pending', 'In Progress', 'Rendered', 'Uploaded'];
  if (validStatuses.indexOf(newStatus) === -1) return;

  var projectId = sheet.getRange(row, PROJECT_ID_COL).getValue();
  if (!projectId) return;

  syncStatusToBackend(projectId, newStatus);
}

// ── Push a status change to the backend (which updates the Sheet column) ──────
function syncStatusToBackend(projectId, status) {
  try {
    var options = {
      method:      'PUT',
      contentType: 'application/json',
      payload:     JSON.stringify({ status: status, source: 'google-sheets' }),
      muteHttpExceptions: true,
    };
    var url      = BACKEND_URL + '/api/projects/' + encodeURIComponent(projectId) + '/status';
    var response = UrlFetchApp.fetch(url, options);
    Logger.log('[sync] ' + projectId + ' → ' + status + ' | response: ' + response.getContentText());
  } catch (err) {
    Logger.log('[sync error] ' + err.message);
  }
}

// ── Web App endpoint — called by the backend to push updates back to the Sheet ─
// The backend calls this URL when the plugin or Frame.io changes status/link.
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var projectId   = data.projectId;
    var status      = data.status;
    var reviewLink = data.reviewLink;

    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);
    var rows  = sheet.getDataRange().getValues();

    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(projectId)) {
        if (status)     sheet.getRange(i + 1, STATUS_COL).setValue(status);
        if (reviewLink) sheet.getRange(i + 1, 7).setValue(reviewLink); // column G = Review Link
        break;
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Utility: log this script's deployed web app URL (run once manually) ───────
function logWebAppUrl() {
  Logger.log(ScriptApp.getService().getUrl());
}
