// Demo store: keeps leads (and their live feed) in this browser's localStorage.
// Used when no Google Sheet is configured.
import type { ActivityEntry, Lead } from "../../types";
import { buildSeedLeads } from "../../data/seed";
import { STAGE_BY_ID } from "../constants";
import { TRACKED_FIELDS, changeKind } from "./shared";
import type { LeadStore } from "./types";

const KEY = "lead-board:demo-leads:v3";
const ACTIVITY_KEY = "lead-board:demo-activity:v1";

function readJson<T>(key: string, fallback: () => T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // ignore corrupt or unavailable storage, fall back
  }
  return fallback();
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or blocked; nothing else to do in demo mode
  }
}

const read = () => readJson<Lead[]>(KEY, () => buildSeedLeads());

/** Show stages by their title, like the Sheet does. */
function display(field: string, value: unknown) {
  if (field === "stage") return STAGE_BY_ID[value as Lead["stage"]]?.title ?? String(value ?? "");
  return String(value ?? "");
}

export const localStore: LeadStore = {
  kind: "demo",
  async load() {
    return read();
  },
  async save(changes) {
    const before = read();
    const byId = new Map(changes.map((c) => [c.id, c.changes]));
    const now = new Date().toISOString();
    const log = readJson<ActivityEntry[]>(ACTIVITY_KEY, () => []);
    for (const lead of before) {
      const ch = byId.get(lead.id);
      if (!ch) continue;
      for (const field of TRACKED_FIELDS) {
        if (!(field in ch)) continue;
        const oldValue = display(field, lead[field]);
        const newValue = display(field, ch[field]);
        if (oldValue === newValue) continue;
        log.push({
          time: now,
          leadId: lead.id,
          contact: String(ch.name ?? lead.name),
          change: changeKind(field, oldValue, newValue),
          field,
          oldValue,
          newValue,
          source: "board",
        });
      }
    }
    writeJson(ACTIVITY_KEY, log.slice(-500));
    writeJson(KEY, before.map((l) => (byId.has(l.id) ? { ...l, ...byId.get(l.id) } : l)));
  },
  async activity(id) {
    return readJson<ActivityEntry[]>(ACTIVITY_KEY, () => [])
      .filter((a) => a.leadId === id)
      .reverse()
      .slice(0, 100);
  },
  async reset() {
    try {
      localStorage.removeItem(KEY);
      localStorage.removeItem(ACTIVITY_KEY);
    } catch {
      /* ignore */
    }
  },
};
