// Picks where leads are stored, based on .env.local:
//   VITE_SHEET_URL + VITE_SHEET_KEY set  -> Google Sheet
//   otherwise                            -> demo data in this browser
import { localStore } from "./local";
import { createSheetStore } from "./sheet";
import type { LeadStore } from "./types";

export type { LeadChange, LeadStore } from "./types";

const url = import.meta.env.VITE_SHEET_URL?.trim();
const key = import.meta.env.VITE_SHEET_KEY?.trim();

export const store: LeadStore = url && key ? createSheetStore(url, key) : localStore;
