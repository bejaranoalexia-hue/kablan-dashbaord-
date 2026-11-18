// Core data model. Keep this file framework-free so it can be shared
// later with a database layer (SQLite / Supabase) or an Electron/Tauri backend.

export type Stage =
  | "new"
  | "contacted"
  | "quoted"
  | "nurturing"
  | "won"
  | "lost"
  | "closed";

export type LeadStatus = "not_started" | "in_progress";

export interface Lead {
  id: string;
  name: string; // may be empty -> shown as "No Name Provided"
  email: string;
  phone: string;
  stage: Stage;
  position: number; // order within its column (0 = top)
  source: string;
  campaign: string;
  assigneeId: string | null;
  status: LeadStatus;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface User {
  id: string;
  name: string;
  initials: string;
}
