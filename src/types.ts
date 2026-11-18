// Core data model. Keep this file framework-free so it can be shared
// with any storage layer (Google Sheet today, a database later).

export type Stage =
  | "new_opportunity"
  | "contacted"
  | "first_follow_up"
  | "second_follow_up"
  | "final_follow_up"
  | "lost"
  | "won";

export type Priority = "High" | "Medium" | "Low" | "";

export interface Lead {
  id: string;
  name: string; // "Contacts Name"; may be empty -> shown as "No Name Provided"
  jobPosition: string;
  priority: Priority;
  email: string;
  phone: string;
  company: string;
  firstContact: string; // "Day of First Contact", YYYY-MM-DD or ""
  secondContact: string; // "Day of Second Contact", YYYY-MM-DD or ""
  stage: Stage;
  position: number; // order within its column (0 = top)
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}
