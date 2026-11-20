// Talks to our own server function (api/board.ts), which talks to the Google Sheet.
// The Sheet URL and secret key live only on the server, never in the browser.
import type { Lead } from "../../types";
import { STAGE_BY_ID, priorityFromText, stageFromText } from "../constants";
import type { LeadStore } from "./types";

const ENDPOINT = "/api/board";

/** The server wants a login first (no session, or it expired). */
export class AuthRequiredError extends Error {}
/** The server has no Sheet settings: fall back to demo data. */
export class NotConfiguredError extends Error {}

type Reply = { ok: boolean; code?: string; error?: string; [k: string]: unknown };

async function post(body: object): Promise<Reply> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Couldn't reach the Lead Board server. Check your internet connection.");
  }
  let data: Reply;
  try {
    data = (await res.json()) as Reply;
  } catch {
    throw new Error(`The Lead Board server had a problem (error ${res.status}).`);
  }
  if (!data.ok) {
    if (data.code === "unauthorized") throw new AuthRequiredError(data.error);
    if (data.code === "not_configured") throw new NotConfiguredError(data.error);
    throw new Error(data.error ?? "Unknown error from the server.");
  }
  return data;
}

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

export const apiStore: LeadStore = {
  kind: "sheet",
  async load() {
    const data = await post({ action: "list" });
    return ((data.leads as SheetRow[] | undefined) ?? []).map(fromRow);
  },
  async save(changes) {
    await post({ action: "update", leads: changes.map((c) => ({ id: c.id, ...toSheet(c.changes) })) });
  },
};

export const auth = {
  /** Does this server use a password at all? (Not when running locally without one.) */
  async passwordRequired(): Promise<boolean> {
    try {
      const res = await fetch(ENDPOINT, { credentials: "same-origin" });
      const data = (await res.json()) as { passwordRequired?: boolean };
      return Boolean(data.passwordRequired);
    } catch {
      return false;
    }
  },
  async login(password: string) {
    await post({ action: "login", password });
  },
  async logout() {
    await post({ action: "logout" });
  },
};
