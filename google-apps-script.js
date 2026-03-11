// ==================================================
// Google Apps Script — deploy as Web App
// ==================================================
// Steps:
// 1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/16xVG6xHsrilXv5I1n-jPS49ka5Dz9Cr1f1e8PDZB2SA/edit
// 2. Extensions → Apps Script
// 3. Paste this entire code (replace any existing code)
// 4. Click Deploy → New deployment
// 5. Type: Web app
// 6. Execute as: Me
// 7. Who has access: Anyone
// 8. Click Deploy → Copy the URL
// 9. Paste the URL in the dashboard settings (webhook field)
// ==================================================

const SHEET_NAME = 'manager-tasks-sheet';

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) {
      return jsonResponse({ error: 'Sheet not found: ' + SHEET_NAME });
    }

    let params;
    if (e.postData) {
      params = JSON.parse(e.postData.contents);
    } else {
      params = e.parameter;
    }

    const action = params.action || 'read';

    if (action === 'read') {
      return readAll(sheet);
    } else if (action === 'toggle') {
      return toggleTask(sheet, params);
    } else if (action === 'update') {
      return updateTask(sheet, params);
    } else if (action === 'add') {
      return addTask(sheet, params);
    } else {
      return jsonResponse({ error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ error: err.toString() });
  }
}

function readAll(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return jsonResponse({ rows: [] });

  const headers = data[0];
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = data[i][idx];
    });
    rows.push(obj);
  }
  return jsonResponse({ rows: rows });
}

function toggleTask(sheet, params) {
  const id = parseInt(params.id);
  const done = String(params.done).toUpperCase() === 'TRUE';
  if (!id) return jsonResponse({ error: 'Missing id' });

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');
  const doneCol = headers.indexOf('done');

  if (idCol === -1 || doneCol === -1) {
    return jsonResponse({ error: 'Missing id or done column' });
  }

  for (let i = 1; i < data.length; i++) {
    if (parseInt(data[i][idCol]) === id) {
      sheet.getRange(i + 1, doneCol + 1).setValue(done ? 'TRUE' : 'FALSE');
      return jsonResponse({ success: true, id: id, done: done });
    }
  }
  return jsonResponse({ error: 'Task not found: ' + id });
}

function updateTask(sheet, params) {
  const id = parseInt(params.id);
  if (!id) return jsonResponse({ error: 'Missing id' });

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('id');

  for (let i = 1; i < data.length; i++) {
    if (parseInt(data[i][idCol]) === id) {
      const row = i + 1;
      for (const [key, value] of Object.entries(params)) {
        if (key === 'action' || key === 'id') continue;
        const col = headers.indexOf(key);
        if (col !== -1) {
          sheet.getRange(row, col + 1).setValue(value);
        }
      }
      return jsonResponse({ success: true, id: id });
    }
  }
  return jsonResponse({ error: 'Task not found: ' + id });
}

function addTask(sheet, params) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  // Find max ID
  const idCol = headers.indexOf('id');
  let maxId = 0;
  for (let i = 1; i < data.length; i++) {
    const val = parseInt(data[i][idCol]);
    if (val > maxId) maxId = val;
  }

  const newRow = headers.map(h => {
    if (h === 'id') return maxId + 1;
    if (h === 'done') return 'FALSE';
    if (h === 'verified_in_code') return 'FALSE';
    if (h === 'priority') return params.priority || 5;
    if (h === 'est_hours') return params.est_hours || 1;
    return params[h] || '';
  });

  sheet.appendRow(newRow);
  return jsonResponse({ success: true, id: maxId + 1 });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
