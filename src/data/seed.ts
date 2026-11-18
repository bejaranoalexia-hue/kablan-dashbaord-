// Invented sample data for development only. None of these people are real.
import type { Lead, LeadStatus, Stage, User } from "../types";

export const SEED_USERS: User[] = [
  { id: "u1", name: "Maya Torres", initials: "MT" },
  { id: "u2", name: "Jordan Pike", initials: "JP" },
  { id: "u3", name: "Riley Chen", initials: "RC" },
  { id: "u4", name: "Sam Okafor", initials: "SO" },
];

type SeedRow = [name: string, stage: Stage, source: string, campaign: string, assigneeId: string | null, status: LeadStatus, daysAgo: number];

const ROWS: SeedRow[] = [
  ["Harriet Lindqvist", "new", "Google LSA", "Spring Tune-Up", "u1", "not_started", 0],
  ["", "new", "Facebook Messenger", "FB Lead Ads – Q4", null, "not_started", 0],
  ["Dorian Wexley", "new", "Email", "Newsletter", "u2", "not_started", 1],
  ["Priya Ramanathan", "new", "Website Form", "Free Estimate", "u3", "in_progress", 1],
  ["", "new", "Google LSA", "Emergency Repair", "u4", "not_started", 2],
  ["Felix Arbogast", "contacted", "Phone Call", "Organic", "u1", "in_progress", 3],
  ["Noor Haddad", "contacted", "Facebook Messenger", "FB Lead Ads – Q4", "u2", "in_progress", 3],
  ["Gideon Vale", "contacted", "Google LSA", "Spring Tune-Up", "u3", "not_started", 4],
  ["Tamsin Okoro", "contacted", "Referral", "Partner Referral", "u1", "in_progress", 5],
  ["Lucia Benedetti", "quoted", "Website Form", "Free Estimate", "u4", "in_progress", 6],
  ["Ansel Fairbanks", "quoted", "Email", "Winter Promo", "u2", "in_progress", 7],
  ["Wren Kowalczyk", "quoted", "Google LSA", "Emergency Repair", "u3", "not_started", 8],
  ["Ozzie Marchetti", "nurturing", "Facebook Messenger", "Retargeting", "u1", "not_started", 10],
  ["Bettina Sorensen", "nurturing", "Email", "Newsletter", "u4", "in_progress", 12],
  ["", "nurturing", "Website Form", "Free Estimate", "u2", "not_started", 14],
  ["Cyrus Abernathy", "won", "Referral", "Partner Referral", "u3", "in_progress", 15],
  ["Mirela Dragan", "won", "Google LSA", "Spring Tune-Up", "u1", "in_progress", 16],
  ["Quentin Ashby", "won", "Phone Call", "Organic", "u4", "in_progress", 18],
  ["Ines Valcourt", "lost", "Facebook Messenger", "FB Lead Ads – Q4", "u2", "not_started", 20],
  ["Bram Holloway", "lost", "Email", "Winter Promo", "u3", "not_started", 21],
  ["Saoirse Delaney", "lost", "Google LSA", "Emergency Repair", null, "not_started", 22],
  ["Elio Fontaine", "closed", "Website Form", "Free Estimate", "u1", "not_started", 25],
  ["Junie Calloway", "closed", "Referral", "Partner Referral", "u4", "not_started", 28],
  ["Kasimir Brandt", "new", "Phone Call", "Organic", "u2", "not_started", 0],
  ["Leontyne Hargrove", "quoted", "Facebook Messenger", "Retargeting", "u1", "in_progress", 9],
];

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");
}

export function buildSeedLeads(now = new Date()): Lead[] {
  const positions: Partial<Record<Stage, number>> = {};
  return ROWS.map(([name, stage, source, campaign, assigneeId, status, daysAgo], i) => {
    const created = new Date(now);
    created.setDate(created.getDate() - daysAgo);
    created.setHours(8 + ((i * 3) % 10), (i * 17) % 60, 0, 0);
    const position = positions[stage] ?? 0;
    positions[stage] = position + 1;
    const phoneTail = String(1000 + i * 37).slice(-4);
    return {
      id: `lead-${i + 1}`,
      name,
      email: name ? `${slug(name)}@example.com` : `inquiry${i + 1}@example.com`,
      phone: `(555) 01${String(i).padStart(2, "0")}-${phoneTail}`,
      stage,
      position,
      source,
      campaign,
      assigneeId,
      status,
      createdAt: created.toISOString(),
      updatedAt: created.toISOString(),
    };
  });
}
