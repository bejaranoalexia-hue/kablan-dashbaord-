/**
 * Lead Board – Google Sheet backend.
 *
 * Paste this whole file into your Sheet's Apps Script editor
 * (Extensions → Apps Script), add your key as a Script Property named SECRET,
 * then Deploy → New deployment → Web app.
 * See SHEET_SETUP.md in the project for step-by-step instructions.
 *
 * How it works (all requests are POSTs with a JSON body that includes the key):
 *  - {key, action: "list"}                → returns every lead row
 *  - {key, action: "update", leads: [...]} → updates the matching rows (matched by "Lead ID")
 * Rows you type in by hand get a Lead ID, Stage "New Opportunity" and Created At
 * filled in automatically the next time the board loads.
 */

// The secret key must match SHEET_KEY in the project's .env.local file.
// Recommended: store it as a Script Property named SECRET
//   (Project Settings ⚙ → Script properties → Add script property).
// The property wins if it's set. Otherwise the value on the next line is used.
const SECRET = 'PASTE-YOUR-KEY-HERE';

// Name of the tab that holds your leads. If no tab has this name, the first tab is used.
const SHEET_NAME = 'Leads';

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
    throw new Error('Unknown action: ' + body.action);
  });
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

function cellToString(value, field) {
  if (value === null || value === undefined) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    if (DATE_FIELDS.indexOf(field) >= 0) {
      return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    }
    return value.toISOString();
  }
  return String(value).trim();
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
  return leads;
}

function updateLeads(changes) {
  if (!changes.length) return 0;
  const sheet = getSheet();
  const cols = ensureHeaders(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const ids = sheet.getRange(2, cols.id + 1, lastRow - 1, 1).getValues();
  const rowById = {};
  ids.forEach(function (r, i) { if (r[0]) rowById[String(r[0])] = i + 2; });

  let updated = 0;
  changes.forEach(function (lead) {
    const rowNumber = rowById[lead.id];
    if (!rowNumber) return; // row was deleted in the Sheet; ignore
    Object.keys(lead).forEach(function (field) {
      if (field === 'id' || cols[field] === undefined) return;
      const cell = sheet.getRange(rowNumber, cols[field] + 1);
      const value = lead[field] === null || lead[field] === undefined ? '' : lead[field];
      // Keep ISO timestamps as plain text so Sheets doesn't reformat them.
      if (field === 'createdAt' || field === 'updatedAt') cell.setValue("'" + value);
      else cell.setValue(value);
    });
    updated++;
  });
  return updated;
}
