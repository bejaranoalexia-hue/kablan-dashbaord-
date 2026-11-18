// Persistence layer. Right now it's localStorage; later swap these two
// functions for SQLite / Supabase calls without touching the UI.
import type { Lead } from "../types";
import { buildSeedLeads } from "../data/seed";

// v2: new stage names, no assignee. Bumping the key starts fresh from the seed.
const KEY = "lead-board:leads:v2";

export function loadLeads(): Lead[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Lead[];
  } catch {
    // ignore corrupt or unavailable storage, fall back to seed
  }
  return buildSeedLeads();
}

export function saveLeads(leads: Lead[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(leads));
  } catch {
    // storage full or blocked; nothing else to do for now
  }
}

export function resetLeads(): Lead[] {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  return buildSeedLeads();
}
