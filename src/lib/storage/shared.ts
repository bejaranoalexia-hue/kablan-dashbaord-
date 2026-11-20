// Pieces shared by the two ways of reaching the Google Sheet:
//   api.ts    -> through our server function (local dev, or a host like Vercel)
//   direct.ts -> straight from the browser (static hosting like GitHub Pages)
import type { Lead } from "../../types";
import { STAGE_BY_ID, priorityFromText, stageFromText } from "../constants";

/** A login is needed (no session / no key saved, or it was rejected). */
export class AuthRequiredError extends Error {}
/** No Sheet is configured: fall back to demo data. */
export class NotConfiguredError extends Error {}

export interface Auth {
  /** Is there a login screen at all? */
  passwordRequired(): Promise<boolean>;
  /** Throws an Error with a friendly message if the password/key is wrong. */
  login(password: string): Promise<void>;
  logout(): Promise<void>;
  /** Words for the login screen. */
  label: { field: string; hint: string };
}

/** A row as the Apps Script sends it: every value is a string. */
export type SheetRow = Record<keyof Lead, string>;

export function fromRow(r: SheetRow): Lead {
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
export function toSheet(changes: Partial<Lead>): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(changes)) {
    if (key === "stage") out.stage = STAGE_BY_ID[value as Lead["stage"]].title;
    else out[key] = value as string | number;
  }
  return out;
}
