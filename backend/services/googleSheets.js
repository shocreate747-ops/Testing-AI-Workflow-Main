const { google } = require('googleapis');

// Sheet columns:
// A=Animation No.  B=Editor  C=Spell Check  D=Sources Verified
// E=Fonts Consistency  F=Color Consistency  G=Understandability
// H=Realistic Midjourney  I=Brolls Accuracy  J=Timely Submission
// K=Reviewer  L=Review Link  M=Status

const DEFAULT_SHEET_ID   = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'Sheet1';

const VALID_STATUSES = ['Pending', 'In Progress', 'Rendered', 'Uploaded'];

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function getSheetsClient() {
  return google.sheets({ version: 'v4', auth: getAuth() });
}

function resolveSheetId(sheetId) {
  return sheetId || DEFAULT_SHEET_ID;
}

function toBoolean(val) {
  if (typeof val === 'boolean') return val;
  return String(val).toUpperCase() === 'TRUE';
}

async function getAllAnimations(sheetId) {
  const id = resolveSheetId(sheetId);
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range: `${SHEET_NAME}!A2:M`,
  });
  return (res.data.values || [])
    .filter(row => row[0])
    .map((row, i) => ({
      rowIndex:            i + 2,
      animationNo:         row[0]  || '',
      editor:              row[1]  || 'Not Assigned',
      spellCheck:          toBoolean(row[2]),
      sourcesVerified:     toBoolean(row[3]),
      fontsConsistency:    toBoolean(row[4]),
      colorConsistency:    toBoolean(row[5]),
      understandability:   toBoolean(row[6]),
      realisticMidjourney: toBoolean(row[7]),
      brollsAccuracy:      toBoolean(row[8]),
      timelySubmission:    toBoolean(row[9]),
      reviewer:            row[10] || 'Not Reviewed',
      reviewLink:          row[11] || '',
      status:              row[12] || 'Pending',
    }));
}

const FIELD_COL = {
  editor:              'B',
  spellCheck:          'C',
  sourcesVerified:     'D',
  fontsConsistency:    'E',
  colorConsistency:    'F',
  understandability:   'G',
  realisticMidjourney: 'H',
  brollsAccuracy:      'I',
  timelySubmission:    'J',
  reviewer:            'K',
  reviewLink:          'L',
  status:              'M',
};

async function updateAnimationField(animationNo, field, value, sheetId) {
  const id  = resolveSheetId(sheetId);
  const col = FIELD_COL[field];
  if (!col) throw new Error(`Unknown field: ${field}`);

  const sheets     = await getSheetsClient();
  const animations = await getAllAnimations(id);
  const anim       = animations.find(a => a.animationNo === animationNo);
  if (!anim) throw new Error(`Animation "${animationNo}" not found in sheet`);

  await sheets.spreadsheets.values.update({
    spreadsheetId: id,
    range: `${SHEET_NAME}!${col}${anim.rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[value]] },
  });
  return { ...anim, [field]: value };
}

// Called by Frame.io webhook — writes review link + sets status to Uploaded
async function markUploaded(animationNo, reviewLink, sheetId) {
  const id         = resolveSheetId(sheetId);
  const sheets     = await getSheetsClient();
  const animations = await getAllAnimations(id);
  const anim       = animations.find(a => a.animationNo === animationNo);
  if (!anim) throw new Error(`Animation "${animationNo}" not found in sheet`);

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: id,
    requestBody: {
      valueInputOption: 'RAW',
      data: [
        { range: `${SHEET_NAME}!L${anim.rowIndex}`, values: [[reviewLink]] },
        { range: `${SHEET_NAME}!M${anim.rowIndex}`, values: [['Uploaded']] },
      ],
    },
  });
  return { ...anim, reviewLink, status: 'Uploaded' };
}

module.exports = { getAllAnimations, updateAnimationField, markUploaded, FIELD_COL, VALID_STATUSES };
