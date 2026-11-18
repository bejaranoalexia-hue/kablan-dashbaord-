import type { LeadStatus, Stage } from "../types";

export interface StageInfo {
  id: Stage;
  title: string;
  subtitle: string;
  // Tailwind classes for the badge + column accent
  badge: string;
  accent: string;
}

export const STAGES: StageInfo[] = [
  { id: "new_opportunity", title: "New Opportunity", subtitle: "Just came in, reach out", badge: "bg-sky-100 text-sky-700", accent: "bg-sky-500" },
  { id: "contacted", title: "Contacted", subtitle: "First touch made", badge: "bg-indigo-100 text-indigo-700", accent: "bg-indigo-500" },
  { id: "first_follow_up", title: "First Follow-Up", subtitle: "1st check-in sent", badge: "bg-amber-100 text-amber-800", accent: "bg-amber-500" },
  { id: "second_follow_up", title: "Second Follow-Up", subtitle: "2nd check-in sent", badge: "bg-orange-100 text-orange-800", accent: "bg-orange-500" },
  { id: "final_follow_up", title: "Final Follow-Up", subtitle: "Last attempt before closing out", badge: "bg-violet-100 text-violet-700", accent: "bg-violet-500" },
  { id: "lost", title: "Lost", subtitle: "Didn't move forward", badge: "bg-rose-100 text-rose-700", accent: "bg-rose-500" },
  { id: "won", title: "Won", subtitle: "Booked or signed", badge: "bg-emerald-100 text-emerald-700", accent: "bg-emerald-500" },
];

export const STAGE_BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s])) as Record<Stage, StageInfo>;

export const SOURCES = [
  "Google LSA",
  "Facebook Messenger",
  "Email",
  "Website Form",
  "Phone Call",
  "Referral",
];

export const STATUS_LABEL: Record<LeadStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
};
