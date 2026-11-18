// Google Sheet store: talks to the Apps Script web app in apps-script/Code.gs.
import type { Lead } from "../../types";
import { STAGE_BY_ID, priorityFromText, stageFromText } from "../constants";
import type { LeadStore } from "./types";

/** A row as the Apps Script sends it: every value is a string. */
type SheetRow = Record<keyof Lead, string>;

function fromRow(r: SheetRow): Lead {
  const position = r.position === "" ? NaN : Number(r.position);
  return {
    id: r.id,
    name: r.name ?? "",
    jobPosition: r.jobPosition ?? "",
    priority: priorityFromText(r.priority ?? ""),
    email: r.email ?? "",
    phone: r.phone ?? "",
    company: r.company ?? "",
    firstContact: r.firstContact ?? "",
    secondContact: r.secondContact ?? "",
    stage: stageFromText(r.stage ?? ""),
    position: Number.isFinite(position) ? position : -1, // -1 = new row, goes to the top
    createdAt: r.createdAt || new Date().toISOString(),
    updatedAt: r.updatedAt || r.createdAt || new Date().toISOString(),
  };
}

/** Convert app values to what should appear in the Sheet cells. */
function toSheet(changes: Partial<Lead>): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(changes)) {
    if (key === "stage") out.stage = STAGE_BY_ID[value as Lead["stage"]].title;
    else out[key] = value as string | number;
  }
  return out;
}

export function createSheetStore(url: string, key: string): LeadStore {
  async function call(body: object) {
    let res: Response;
    try {
      // text/plain keeps this a "simple" request, which Apps Script accepts from the browser.
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ key, ...body }),
      });
    } catch {
      throw new Error("Couldn't reach the Google Sheet. Check your internet connection and the web app URL.");
    }
    let data: { ok: boolean; error?: string; leads?: SheetRow[] };
    try {
      data = await res.json();
    } catch {
      throw new Error("The Google Sheet web app didn't send back data. Is it deployed with access set to \"Anyone\"?");
    }
    if (!data.ok) throw new Error(`Google Sheet: ${data.error ?? "unknown error"}`);
    return data;
  }

  return {
    kind: "sheet",
    async load() {
      const data = await call({ action: "list" });
      return (data.leads ?? []).map(fromRow);
    },
    async save(changes) {
      await call({ action: "update", leads: changes.map((c) => ({ id: c.id, ...toSheet(c.changes) })) });
    },
  };
}
