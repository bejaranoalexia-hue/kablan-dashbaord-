import type { Priority, Stage } from "../types";

export interface StageInfo {
  id: Stage;
  title: string; // also the exact text stored in the Sheet's "Stage" column
  subtitle: string;
  // Tailwind classes for the badge + column accent
  badge: string;
  accent: string;
}

export const STAGES: StageInfo[] = [
  { id: "new_opportunity", title: "New Opportunity", subtitle: "Just found, reach out", badge: "bg-sky-100 text-sky-700", accent: "bg-sky-500" },
  { id: "contacted", title: "Contacted", subtitle: "First touch made", badge: "bg-indigo-100 text-indigo-700", accent: "bg-indigo-500" },
  { id: "first_follow_up", title: "First Follow-Up", subtitle: "1st check-in sent", badge: "bg-amber-100 text-amber-800", accent: "bg-amber-500" },
  { id: "second_follow_up", title: "Second Follow-Up", subtitle: "2nd check-in sent", badge: "bg-orange-100 text-orange-800", accent: "bg-orange-500" },
  { id: "final_follow_up", title: "Final Follow-Up", subtitle: "Last attempt before closing out", badge: "bg-violet-100 text-violet-700", accent: "bg-violet-500" },
  { id: "lost", title: "Lost", subtitle: "Not moving forward", badge: "bg-rose-100 text-rose-700", accent: "bg-rose-500" },
  { id: "won", title: "Won", subtitle: "Interview or offer landed", badge: "bg-emerald-100 text-emerald-700", accent: "bg-emerald-500" },
];

export const STAGE_BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s])) as Record<Stage, StageInfo>;

/** Turn whatever is typed in the Sheet's Stage cell into a stage id (blank/unknown -> New Opportunity). */
export function stageFromText(text: string): Stage {
  const norm = text.toLowerCase().replace(/[^a-z0-9]/g, "");
  const match = STAGES.find((s) => s.id.replace(/_/g, "") === norm || s.title.toLowerCase().replace(/[^a-z0-9]/g, "") === norm);
  return match ? match.id : "new_opportunity";
}

/** Labels for lead fields, matching the Sheet's column headers. */
export const FIELD_LABEL: Record<string, string> = {
  name: "Contacts Name",
  jobPosition: "Job Position",
  priority: "Priority",
  email: "Email",
  phone: "Phone Number",
  company: "Company",
  firstContact: "Day of First Contact",
  secondContact: "Day of Second Contact",
  stage: "Stage",
};

export const PRIORITIES: Exclude<Priority, "">[] = ["High", "Medium", "Low"];

export const PRIORITY_STYLE: Record<Priority, string> = {
  High: "bg-rose-100 text-rose-700",
  Medium: "bg-amber-100 text-amber-800",
  Low: "bg-slate-100 text-slate-600",
  "": "",
};

export function priorityFromText(text: string): Priority {
  const t = text.trim().toLowerCase();
  return PRIORITIES.find((p) => p.toLowerCase() === t) ?? "";
}
