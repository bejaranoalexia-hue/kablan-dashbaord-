import type { Lead } from "../../types";

/** One lead's changed fields, sent to the store after a drag or an edit. */
export interface LeadChange {
  id: string;
  changes: Partial<Lead>;
}

/**
 * Anything that can load and save leads. The app only talks to this interface,
 * so the Google Sheet can later be swapped for a database without touching the UI.
 */
export interface LeadStore {
  kind: "sheet" | "demo";
  load(): Promise<Lead[]>;
  save(changes: LeadChange[]): Promise<void>;
  reset?(): Promise<void>; // demo only: restore sample data
}
