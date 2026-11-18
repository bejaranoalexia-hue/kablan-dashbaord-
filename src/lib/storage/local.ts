// Demo store: keeps leads in this browser's localStorage. Used when no Google Sheet is configured.
import type { Lead } from "../../types";
import { buildSeedLeads } from "../../data/seed";
import type { LeadStore } from "./types";

const KEY = "lead-board:demo-leads:v3";

function read(): Lead[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Lead[];
  } catch {
    // ignore corrupt or unavailable storage, fall back to seed
  }
  return buildSeedLeads();
}

function write(leads: Lead[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(leads));
  } catch {
    // storage full or blocked; nothing else to do in demo mode
  }
}

export const localStore: LeadStore = {
  kind: "demo",
  async load() {
    return read();
  },
  async save(changes) {
    const byId = new Map(changes.map((c) => [c.id, c.changes]));
    write(read().map((l) => (byId.has(l.id) ? { ...l, ...byId.get(l.id) } : l)));
  },
  async reset() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  },
};
