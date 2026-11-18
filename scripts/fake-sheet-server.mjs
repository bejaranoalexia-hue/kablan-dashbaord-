// Local stand-in for Google Apps Script, for testing without a Google account.
// It runs the REAL apps-script/Code.gs against an in-memory spreadsheet.
//
//   node scripts/fake-sheet-server.mjs            -> http://localhost:8787
//   GET  /__sheet           show the fake sheet's cells
//   POST /__append  {...}   add a row as if typed by hand, e.g. {"Contacts Name":"Ada","Company":"Acme"}
//
// Point .env.local at it with VITE_SHEET_URL=http://localhost:8787 and VITE_SHEET_KEY=local-test-key
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import vm from "node:vm";

const PORT = Number(process.env.PORT ?? 8787);
const KEY = process.env.SHEET_KEY ?? "local-test-key";

// Starts with the user's own header spelling (including "Fist") and two hand-typed rows.
const grid = [
  ["Contacts Name", "Job Position", "Priority", "Email", "Phone Number", "Company", "Day of Fist Contact", "Day of Second Contact"],
  ["Rosalind Achterberg", "Hiring Manager", "High", "rosalind@example.com", "555-0142", "Kestrel Works", new Date(2026, 10, 10), ""],
  ["", "Recruiter", "Low", "", "", "Thistle & Co", "", ""],
];

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

const sheet = {
  getLastRow: () => {
    for (let r = grid.length; r > 0; r--) if (grid[r - 1].some((c) => c !== "" && c != null)) return r;
    return 0;
  },
  getLastColumn: () => Math.max(0, ...grid.map((row) => {
    for (let c = row.length; c > 0; c--) if (row[c - 1] !== "" && row[c - 1] != null) return c;
    return 0;
  })),
  getRange(row, col, numRows = 1, numCols = 1) {
    return {
      getValues: () =>
        Array.from({ length: numRows }, (_, i) =>
          Array.from({ length: numCols }, (_, j) => grid[row - 1 + i]?.[col - 1 + j] ?? ""),
        ),
      setValue: (v) => {
        while (grid.length < row) grid.push([]);
        const r = grid[row - 1];
        while (r.length < col) r.push("");
        r[col - 1] = cellValue(v);
      },
    };
  },
};

const fakes = {
  SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => null, getSheets: () => [sheet] }) },
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
};

const code = readFileSync(new URL("../apps-script/Code.gs", import.meta.url), "utf8").replace(
  "const SECRET = 'PASTE-YOUR-KEY-HERE';",
  `const SECRET = ${JSON.stringify(KEY)};`,
);
const ctx = vm.createContext({ ...fakes, JSON, Object, String, Number, Math, Date });
vm.runInContext(code + "\n;globalThis.doGet = doGet; globalThis.doPost = doPost;", ctx);

function readBody(req) {
  return new Promise((resolve) => {
    let s = "";
    req.on("data", (c) => (s += c));
    req.on("end", () => resolve(s));
  });
}

createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const send = (body) => {
    res.setHeader("Content-Type", "application/json");
    res.end(typeof body === "string" ? body : JSON.stringify(body, null, 2));
  };
  if (req.url === "/__sheet") return send(grid);
  if (req.url === "/__append" && req.method === "POST") {
    const values = JSON.parse(await readBody(req));
    const row = grid[0].map((h) => (h in values ? cellValue(values[h]) : ""));
    grid.push(row);
    return send({ ok: true });
  }
  if (req.method === "POST") return send(ctx.doPost({ postData: { contents: await readBody(req) } }).content);
  return send(ctx.doGet({ parameter: {} }).content);
}).listen(PORT, () => console.log(`Fake Apps Script running on http://localhost:${PORT} (key: ${KEY})`));
