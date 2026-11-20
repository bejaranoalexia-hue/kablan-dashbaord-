/**
 * Lead Board – Google Sheet backend.
 *
 * Paste this whole file into your Sheet's Apps Script editor
 * (Extensions → Apps Script), add your key as a Script Property named SECRET,
 * then Deploy → New deployment → Web app.
 * See SHEET_SETUP.md in the project for step-by-step instructions.
 *
 * How it works (all requests are POSTs with a JSON body that includes the key):
 *  - {key, action: "list"}                 → returns every lead row
 *  - {key, action: "update", leads: [...]} → updates the matching rows (matched by "Lead ID")
 *  - {key, action: "activity", id}         → that lead's change history, newest first
 * Rows you type in by hand get a Lead ID, Stage "New Opportunity" and Created At
 * filled in automatically the next time the board loads.
 *
 * Every change is written to an "Activity" tab (created automatically):
 * changes made on the board, edits typed directly in the Sheet (via onEdit), and new rows.
 */

// The secret key must match SHEET_KEY in the project's .env.local file.
// Recommended: store it as a Script Property named SECRET
//   (Project Settings ⚙ → Script properties → Add script property).
// The property wins if it's set. Otherwise the value on the next line is used.
const SECRET = 'PASTE-YOUR-KEY-HERE';

// Name of the tab that holds your leads. If no tab has this name, the first tab is used.
const SHEET_NAME = 'Leads';

// Name of the tab that holds the change history.
const ACTIVITY_SHEET_NAME = 'Activity';
const ACTIVITY_HEADERS = ['Time', 'Lead ID', 'Contact', 'Change', 'Field', 'Old Value', 'New Value', 'Source'];
const ACTIVITY_LIMIT = 100; // most recent entries returned per lead

// Columns, in the order they are created on a blank sheet.
// [field name used by the app, header text in the Sheet]
const COLUMNS = [
  ['name', 'Contacts Name'],
  ['jobPosition', 'Job Position'],
  ['priority', 'Priority'],
  ['email', 'Email'],
  ['phone', 'Phone Number'],
  ['company', 'Company'],
  ['firstContact', 'Day of First Contact'],
  ['secondContact', 'Day of Second Contact'],
  ['stage', 'Stage'],
  ['position', 'Order'],
  ['id', 'Lead ID'],
  ['createdAt', 'Created At'],
  ['updatedAt', 'Updated At'],
];

// Other header spellings that are accepted (lowercase, letters/numbers only).
const ALIASES = {
  contactname: 'name',
  name: 'name',
  dayoffistcontact: 'firstContact',
  firstcontact: 'firstContact',
  secondcontact: 'secondContact',
  phone: 'phone',
};

// Fields the user types that mean "this row is a real lead" (blank rows are skipped).
const CONTENT_FIELDS = ['name', 'jobPosition', 'email', 'phone', 'company'];
const DATE_FIELDS = ['firstContact', 'secondContact'];
// Fields whose changes appear in the live feed (bookkeeping columns are left out).
const TRACKED_FIELDS = ['name', 'jobPosition', 'priority', 'email', 'phone', 'company', 'firstContact', 'secondContact', 'stage'];

// Opening the web app URL in a browser just confirms it is running.
function doGet() {
  return respond(function () {
    return { ok: true, message: 'Lead Board backend is running.' };
  });
}

function doPost(e) {
  return respond(function () {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    checkKey(body.key);
    if (body.action === 'list') return { ok: true, leads: readLeads() };
    if (body.action === 'update') return { ok: true, updated: updateLeads(body.leads || []) };
    if (body.action === 'activity') return { ok: true, activity: readActivity(String(body.id || '')) };
    throw new Error('Unknown action: ' + body.action);
  });
}

/**
 * Runs automatically when someone types in the Sheet (a "simple trigger": no setup needed).
 * Logs the change to the Activity tab and bumps the row's "Updated At".
 */
function onEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  if (sheet.getName() !== getSheet().getName()) return; // only the leads tab
  const firstRow = e.range.getRow();
  const numRows = e.range.getNumRows();
  if (firstRow + numRows - 1 < 2) return; // header row only

  const cols = ensureHeaders(sheet);
  const fieldByCol = {};
  Object.keys(cols).forEach(function (f) { fieldByCol[cols[f]] = f; });

  const width = sheet.getLastColumn();
  const startRow = Math.max(firstRow, 2);
  const rows = sheet.getRange(startRow, 1, firstRow + numRows - startRow, width).getValues();
  const singleCell = numRows === 1 && e.range.getNumColumns() === 1;
  const now = new Date().toISOString();
  const entries = [];

  rows.forEach(function (row, i) {
    const id = cellToString(row[cols.id], 'id');
    if (!id) return; // brand-new row: it's logged as "Lead added" when the board first loads it
    let touched = false;
    for (let c = e.range.getColumn(); c < e.range.getColumn() + e.range.getNumColumns(); c++) {
      const field = fieldByCol[c - 1];
      if (TRACKED_FIELDS.indexOf(field) < 0) continue;
      const newValue = cellToString(row[c - 1], field);
      const oldValue = singleCell ? oldCellToString(e.oldValue, field) : '';
      if (singleCell && oldValue === newValue) continue;
      entries.push(activityEntry(now, id, cellToString(row[cols.name], 'name'), field, oldValue, newValue, 'sheet'));
      touched = true;
    }
    if (touched) sheet.getRange(startRow + i, cols.updatedAt + 1).setValue("'" + now);
  });
  appendActivity(entries);
}

/** Optional: run once from the editor to add headers, dropdowns and date formatting. */
function setup() {
  const sheet = getSheet();
  const cols = ensureHeaders(sheet);
  sheet.setFrozenRows(1);
  const rows = Math.max(sheet.getMaxRows() - 1, 1);
  const dropdown = function (values) {
    return SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(true).build();
  };
  sheet.getRange(2, cols.priority + 1, rows, 1).setDataValidation(dropdown(['High', 'Medium', 'Low']));
  sheet.getRange(2, cols.stage + 1, rows, 1).setDataValidation(dropdown([
    'New Opportunity', 'Contacted', 'First Follow-Up', 'Second Follow-Up', 'Final Follow-Up', 'Lost', 'Won',
  ]));
  DATE_FIELDS.forEach(function (f) {
    sheet.getRange(2, cols[f] + 1, rows, 1).setNumberFormat('yyyy-mm-dd');
  });
  getActivitySheet().setFrozenRows(1);
}

// ---------------------------------------------------------------------------

function respond(fn) {
  let result;
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    result = fn();
  } catch (err) {
    result = { ok: false, error: String((err && err.message) || err) };
  } finally {
    lock.releaseLock();
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function getSecret() {
  const fromProperty = PropertiesService.getScriptProperties().getProperty('SECRET');
  return String(fromProperty || SECRET || '').trim();
}

function checkKey(key) {
  const secret = getSecret();
  if (!secret || secret === 'PASTE-YOUR-KEY-HERE') {
    throw new Error('SECRET is not set in the Apps Script (add a Script Property named SECRET).');
  }
  if (key !== secret) throw new Error('Wrong key.');
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
}

function getActivitySheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(ACTIVITY_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(ACTIVITY_SHEET_NAME);
    sheet.getRange(1, 1, 1, ACTIVITY_HEADERS.length).setValues([ACTIVITY_HEADERS]);
  }
  return sheet;
}

function normalize(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Make sure every column exists. Returns {field: zero-based column index}. */
function ensureHeaders(sheet) {
  const lastCol = sheet.getLastColumn();
  const headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  const byNorm = {};
  COLUMNS.forEach(function (c) { byNorm[normalize(c[1])] = c[0]; });
  Object.keys(ALIASES).forEach(function (k) { byNorm[k] = ALIASES[k]; });

  const cols = {};
  headers.forEach(function (h, i) {
    const field = byNorm[normalize(h)];
    if (field && cols[field] === undefined) cols[field] = i;
  });

  // Trailing empty header cells can be reused.
  let next = headers.length;
  while (next > 0 && String(headers[next - 1]).trim() === '') next--;
  COLUMNS.forEach(function (c) {
    if (cols[c[0]] === undefined) {
      sheet.getRange(1, next + 1).setValue(c[1]);
      cols[c[0]] = next;
      next++;
    }
  });
  return cols;
}

function formatDay(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function cellToString(value, field) {
  if (value === null || value === undefined) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    if (DATE_FIELDS.indexOf(field) >= 0) return formatDay(value);
    return value.toISOString();
  }
  return String(value).trim();
}

/** e.oldValue for a date cell is a day number (e.g. "46345"); turn it back into yyyy-MM-dd. */
function oldCellToString(value, field) {
  if (value === null || value === undefined) return '';
  const text = String(value).trim();
  if (DATE_FIELDS.indexOf(field) >= 0 && /^\d+(\.\d+)?$/.test(text)) {
    // Read the calendar date in UTC so the time zone can't shift it by a day.
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(text)) * 86400000);
    const pad = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }
  return text;
}

/** Describe one change: created / stage / added / removed / changed. */
function activityEntry(time, id, contact, field, oldValue, newValue, source) {
  let change = 'changed';
  if (field === 'stage') change = 'stage';
  else if (!oldValue && newValue) change = 'added';
  else if (oldValue && !newValue) change = 'removed';
  return [time, id, contact, change, field, oldValue, newValue, source];
}

function appendActivity(entries) {
  if (!entries.length) return;
  const sheet = getActivitySheet();
  // Leading ' keeps values as plain text (no auto-conversion of dates or numbers).
  const rows = entries.map(function (r) { return r.map(function (v) { return v === '' ? '' : "'" + v; }); });
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, ACTIVITY_HEADERS.length).setValues(rows);
}

function readActivity(id) {
  if (!id) return [];
  const sheet = getActivitySheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, ACTIVITY_HEADERS.length).getValues();
  const out = [];
  for (let i = values.length - 1; i >= 0 && out.length < ACTIVITY_LIMIT; i--) {
    const r = values[i];
    if (String(r[1]) !== id) continue;
    out.push({
      time: cellToString(r[0], 'time'),
      leadId: String(r[1]),
      contact: String(r[2]),
      change: String(r[3]),
      field: String(r[4]),
      oldValue: String(r[5]),
      newValue: String(r[6]),
      source: String(r[7]),
    });
  }
  return out;
}

function readLeads() {
  const sheet = getSheet();
  const cols = ensureHeaders(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const width = sheet.getLastColumn();
  const values = sheet.getRange(2, 1, lastRow - 1, width).getValues();
  const now = new Date().toISOString();
  const leads = [];
  const entries = [];

  values.forEach(function (row, i) {
    const lead = {};
    COLUMNS.forEach(function (c) { lead[c[0]] = cellToString(row[cols[c[0]]], c[0]); });
    const hasContent = CONTENT_FIELDS.some(function (f) { return lead[f] !== ''; });
    if (!hasContent) return;

    const rowNumber = i + 2;
    // New row typed by hand: fill in the app's bookkeeping columns.
    if (!lead.id) {
      lead.id = 'L-' + Utilities.getUuid().slice(0, 8);
      sheet.getRange(rowNumber, cols.id + 1).setValue(lead.id);
      entries.push([now, lead.id, lead.name, 'created', '', '', '', 'sheet']);
    }
    if (!lead.stage) {
      lead.stage = 'New Opportunity';
      sheet.getRange(rowNumber, cols.stage + 1).setValue(lead.stage);
    }
    if (!lead.createdAt) {
      lead.createdAt = now;
      sheet.getRange(rowNumber, cols.createdAt + 1).setValue("'" + now);
    }
    if (!lead.updatedAt) lead.updatedAt = lead.createdAt;
    leads.push(lead);
  });
  appendActivity(entries);
  return leads;
}

function updateLeads(changes) {
  if (!changes.length) return 0;
  const sheet = getSheet();
  const cols = ensureHeaders(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const width = sheet.getLastColumn();
  const ids = sheet.getRange(2, cols.id + 1, lastRow - 1, 1).getValues();
  const rowById = {};
  ids.forEach(function (r, i) { if (r[0]) rowById[String(r[0])] = i + 2; });

  const now = new Date().toISOString();
  const entries = [];
  let updated = 0;
  changes.forEach(function (lead) {
    const rowNumber = rowById[lead.id];
    if (!rowNumber) return; // row was deleted in the Sheet; ignore
    const before = sheet.getRange(rowNumber, 1, 1, width).getValues()[0];
    const contact = lead.name !== undefined ? String(lead.name) : cellToString(before[cols.name], 'name');
    Object.keys(lead).forEach(function (field) {
      if (field === 'id' || cols[field] === undefined) return;
      const value = lead[field] === null || lead[field] === undefined ? '' : lead[field];
      if (TRACKED_FIELDS.indexOf(field) >= 0) {
        const oldValue = cellToString(before[cols[field]], field);
        if (oldValue !== String(value)) entries.push(activityEntry(now, lead.id, contact, field, oldValue, String(value), 'board'));
      }
      const cell = sheet.getRange(rowNumber, cols[field] + 1);
      // Keep ISO timestamps as plain text so Sheets doesn't reformat them.
      if (field === 'createdAt' || field === 'updatedAt') cell.setValue("'" + value);
      else cell.setValue(value);
    });
    updated++;
  });
  appendActivity(entries);
  return updated;
}
