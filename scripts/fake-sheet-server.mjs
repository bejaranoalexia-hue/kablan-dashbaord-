// Local stand-in for Google Apps Script, for testing without a Google account.
// It runs the REAL apps-script/Code.gs against an in-memory spreadsheet.
//
//   node scripts/fake-sheet-server.mjs            -> http://localhost:8787
//   GET  /__sheet            show the leads tab's cells
//   GET  /__activity         show the Activity tab's cells
//   GET  /__updates          show the Updates tab's cells
//   POST /__append  {...}    add a row as if typed by hand, e.g. {"Contacts Name":"Ada","Company":"Acme"}
//   POST /__edit {row, header, value}
//                            type into one cell as if in the Sheet (runs the script's onEdit)
//
// Point .env.local at it with SHEET_URL=http://localhost:8787 and SHEET_KEY=local-test-key
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import vm from "node:vm";

const PORT = Number(process.env.PORT ?? 8787);
const KEY = process.env.SHEET_KEY ?? "local-test-key";

const isDay = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

function cellValue(v) {
  if (typeof v === "string" && v.startsWith("'")) return v.slice(1); // forced text
  if (isDay(v)) {
    const [y, m, d] = v.split("-").map(Number);
    return new Date(y, m - 1, d); // Sheets turns typed dates into Date cells
  }
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return v;
}

/** A minimal in-memory version of a Google Sheets tab. */
function makeSheet(name, grid) {
  const sheet = {
    grid,
    getName: () => name,
    deleteRow: (r) => grid.splice(r - 1, 1),
    getLastRow: () => {
      for (let r = grid.length; r > 0; r--) if (grid[r - 1].some((c) => c !== "" && c != null)) return r;
      return 0;
    },
    getLastColumn: () =>
      Math.max(
        0,
        ...grid.map((row) => {
          for (let c = row.length; c > 0; c--) if (row[c - 1] !== "" && row[c - 1] != null) return c;
          return 0;
        }),
      ),
    getRange(row, col, numRows = 1, numCols = 1) {
      const put = (r, c, v) => {
        while (grid.length < r) grid.push([]);
        const line = grid[r - 1];
        while (line.length < c) line.push("");
        line[c - 1] = cellValue(v);
      };
      return {
        getRow: () => row,
        getColumn: () => col,
        getNumRows: () => numRows,
        getNumColumns: () => numCols,
        getSheet: () => sheet,
        getValues: () =>
          Array.from({ length: numRows }, (_, i) =>
            Array.from({ length: numCols }, (_, j) => grid[row - 1 + i]?.[col - 1 + j] ?? ""),
          ),
        setValue: (v) => put(row, col, v),
        setValues: (values) => values.forEach((line, i) => line.forEach((v, j) => put(row + i, col + j, v))),
      };
    },
  };
  return sheet;
}

// Starts with the user's own header spelling (including "Fist") and two hand-typed rows.
const leads = makeSheet("Sheet1", [
  ["Contacts Name", "Job Position", "Priority", "Email", "Phone Number", "Company", "Day of Fist Contact", "Day of Second Contact"],
  ["Rosalind Achterberg", "Hiring Manager", "High", "rosalind@example.com", "555-0142", "Kestrel Works", new Date(2026, 10, 10), ""],
  ["", "Recruiter", "Low", "", "", "Thistle & Co", "", ""],
]);
const sheets = [leads];

const fakes = {
  SpreadsheetApp: {
    getActiveSpreadsheet: () => ({
      getSheetByName: (n) => sheets.find((s) => s.getName() === n) ?? null,
      getSheets: () => sheets,
      insertSheet: (n) => {
        const s = makeSheet(n, []);
        sheets.push(s);
        return s;
      },
    }),
  },
  ContentService: {
    MimeType: { JSON: "json" },
    createTextOutput: (content) => ({ content, setMimeType() { return this; } }),
  },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  Utilities: {
    getUuid: () => randomUUID(),
    formatDate: (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
  },
  Session: { getScriptTimeZone: () => "local" },
  // The key is provided as a Script Property, like in the real setup.
  // SHEET_KEY_SOURCE=code tests the fallback line in Code.gs; =none tests "no key set".
  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: (name) => (name === "SECRET" && !process.env.SHEET_KEY_SOURCE ? KEY : null),
    }),
  },
};

let code = readFileSync(new URL("../apps-script/Code.gs", import.meta.url), "utf8");
if (process.env.SHEET_KEY_SOURCE === "code") {
  code = code.replace("const SECRET = 'PASTE-YOUR-KEY-HERE';", `const SECRET = ${JSON.stringify(KEY)};`);
}
const ctx = vm.createContext({ ...fakes, JSON, Object, String, Number, Math, Date });
vm.runInContext(code + "\n;globalThis.doGet = doGet; globalThis.doPost = doPost; globalThis.onEdit = onEdit;", ctx);

function readBody(req) {
  return new Promise((resolve) => {
    let s = "";
    req.on("data", (c) => (s += c));
    req.on("end", () => resolve(s));
  });
}

/** Like Google's e.oldValue: text, with dates as day numbers. */
function asOldValue(v) {
  if (v instanceof Date) return String(Math.round((Date.UTC(v.getFullYear(), v.getMonth(), v.getDate()) - Date.UTC(1899, 11, 30)) / 86400000));
  return v === "" || v == null ? undefined : String(v);
}

createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const send = (body) => {
    res.setHeader("Content-Type", "application/json");
    res.end(typeof body === "string" ? body : JSON.stringify(body, null, 2));
  };
  if (req.url === "/__sheet") return send(leads.grid);
  if (req.url === "/__activity") return send(sheets.find((s) => s.getName() === "Activity")?.grid ?? []);
  if (req.url === "/__updates") return send(sheets.find((s) => s.getName() === "Updates")?.grid ?? []);
  if (req.url === "/__append" && req.method === "POST") {
    const values = JSON.parse(await readBody(req));
    leads.grid.push(leads.grid[0].map((h) => (h in values ? cellValue(values[h]) : "")));
    return send({ ok: true });
  }
  if (req.url === "/__edit" && req.method === "POST") {
    const { row, header, value } = JSON.parse(await readBody(req));
    const col = leads.grid[0].indexOf(header) + 1;
    if (!col) return send({ ok: false, error: `No column ${header}` });
    const range = leads.getRange(row, col);
    const oldValue = asOldValue(range.getValues()[0][0]);
    range.setValue(value);
    ctx.onEdit({ range, oldValue, value });
    return send({ ok: true });
  }
  if (req.method === "POST") return send(ctx.doPost({ postData: { contents: await readBody(req) } }).content);
  return send(ctx.doGet({ parameter: {} }).content);
}).listen(PORT, () => console.log(`Fake Apps Script running on http://localhost:${PORT} (key: ${KEY})`));
