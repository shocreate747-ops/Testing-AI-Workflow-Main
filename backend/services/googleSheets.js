const { google } = require('googleapis');

// Sheet columns (1-indexed):
// A=Animation No.  B=Editor  C=Spell Check  D=Sources Verified
// E=Fonts Consistency  F=Color Consistency  G=Understandability
// H=Realistic Midjourney  I=Brolls Accuracy  J=Timely Submission  K=Reviewer

const SHEET_ID   = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'Sheet1';

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

function toBoolean(val) {
  if (typeof val === 'boolean') return val;
  return String(val).toUpperCase() === 'TRUE';
}

async function getAllAnimations() {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A2:K`,
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
};

async function updateAnimationField(animationNo, field, value) {
  const col = FIELD_COL[field];
  if (!col) throw new Error(`Unknown field: ${field}`);

  const sheets     = await getSheetsClient();
  const animations = await getAllAnimations();
  const anim       = animations.find(a => a.animationNo === animationNo);
  if (!anim) throw new Error(`Animation "${animationNo}" not found in sheet`);

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!${col}${anim.rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[value]] },
  });
  return { ...anim, [field]: value };
}

module.exports = { getAllAnimations, updateAnimationField, FIELD_COL };
