// ─────────────────────────────────────────────────────────────────────────────
// Production Tracker — Google Apps Script
//
// HOW TO DEPLOY
// 1. Open your Google Sheet → Extensions → Apps Script
// 2. Paste this entire file, replacing any existing code
// 3. Set BACKEND_URL below to your deployed backend address
// 4. Set SHEET_NAME to the exact tab name in your sheet
// 5. Click Deploy → New deployment → Web app
//    • Execute as: Me  •  Who has access: Anyone
// 6. Add the onEdit trigger:
//    Triggers (clock icon) → Add trigger → onEdit, From spreadsheet, On edit
// ─────────────────────────────────────────────────────────────────────────────

var BACKEND_URL  = 'https://your-backend-url.com'; // ← change this
var SHEET_NAME   = 'Sheet1';                        // ← match your tab name
var ANIM_NO_COL  = 1;                               // column A

// Maps column index → field name
var FIELD_MAP = {
  2:  'editor',
  3:  'spellCheck',
  4:  'sourcesVerified',
  5:  'fontsConsistency',
  6:  'colorConsistency',
  7:  'understandability',
  8:  'realisticMidjourney',
  9:  'brollsAccuracy',
  10: 'timelySubmission',
  11: 'reviewer',
  12: 'reviewLink',
  13: 'status',       // ← Column M: Pending / In Progress / Rendered / Uploaded
};

// ── Trigger: fires on every cell edit ────────────────────────────────────────
function onEdit(e) {
  var sheet = e.source.getActiveSheet();
  if (sheet.getName() !== SHEET_NAME) return;

  var col = e.range.getColumn();
  var row = e.range.getRow();
  if (row < 2) return; // skip header

  var field = FIELD_MAP[col];
  if (!field) return;

  var animationNo = sheet.getRange(row, ANIM_NO_COL).getValue();
  if (!animationNo) return;

  syncToBackend(animationNo, field, e.range.getValue());
}

// ── Push change to backend ────────────────────────────────────────────────────
function syncToBackend(animationNo, field, value) {
  try {
    var options = {
      method:      'PUT',
      contentType: 'application/json',
      payload:     JSON.stringify({ field: field, value: value }),
      muteHttpExceptions: true,
    };
    var url = BACKEND_URL + '/api/animations/' + encodeURIComponent(animationNo) + '/field';
    var response = UrlFetchApp.fetch(url, options);
    Logger.log('[sync] ' + animationNo + '.' + field + ' = ' + value + ' | ' + response.getContentText());
  } catch (err) {
    Logger.log('[sync error] ' + err.message);
  }
}

// ── Web App endpoint — backend pushes updates back to the sheet ───────────────
function doPost(e) {
  try {
    var data        = JSON.parse(e.postData.contents);
    var animationNo = data.animationNo;
    var field       = data.field;
    var value       = data.value;

    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);
    var rows  = sheet.getDataRange().getValues();

    var colIndex = null;
    for (var k in FIELD_MAP) {
      if (FIELD_MAP[k] === field) { colIndex = parseInt(k); break; }
    }
    if (!colIndex) throw new Error('Unknown field: ' + field);

    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(animationNo)) {
        sheet.getRange(i + 1, colIndex).setValue(value);
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

function logWebAppUrl() {
  Logger.log(ScriptApp.getService().getUrl());
}
