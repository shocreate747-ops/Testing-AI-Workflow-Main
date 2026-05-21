const { google } = require('googleapis');

// Expected sheet columns:
// A = Project ID  B = Project Name  C = Task  D = Status  E = Assigned To  F = Deadline  G = Frame.io Link

const SHEET_ID   = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'Projects';

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

async function getAllProjects() {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A2:G`,
  });
  return (res.data.values || []).map((row, i) => ({
    rowIndex: i + 2,
    id:          row[0] || '',
    name:        row[1] || '',
    task:        row[2] || '',
    status:      row[3] || 'Pending',
    assignedTo:  row[4] || '',
    deadline:    row[5] || '',
    frameioLink: row[6] || '',
  }));
}

async function updateProjectStatus(projectId, newStatus) {
  const sheets   = await getSheetsClient();
  const projects = await getAllProjects();
  const project  = projects.find(p => p.id === projectId);
  if (!project) throw new Error(`Project "${projectId}" not found in sheet`);

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!D${project.rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[newStatus]] },
  });
  return { ...project, status: newStatus };
}

async function updateFrameioLink(projectId, link) {
  const sheets   = await getSheetsClient();
  const projects = await getAllProjects();
  const project  = projects.find(p => p.id === projectId);
  if (!project) throw new Error(`Project "${projectId}" not found in sheet`);

  // Write Frame.io link (column G) and mark status as Uploaded (column D) in one batch
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: 'RAW',
      data: [
        { range: `${SHEET_NAME}!D${project.rowIndex}`, values: [['Uploaded']] },
        { range: `${SHEET_NAME}!G${project.rowIndex}`, values: [[link]] },
      ],
    },
  });
  return { ...project, status: 'Uploaded', frameioLink: link };
}

module.exports = { getAllProjects, updateProjectStatus, updateFrameioLink };
