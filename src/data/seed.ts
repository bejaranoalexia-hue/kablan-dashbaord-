// Invented sample data for development only. None of these people are real.
import type { Lead, LeadStatus, Stage } from "../types";

type SeedRow = [name: string, stage: Stage, source: string, campaign: string, status: LeadStatus, daysAgo: number];

const ROWS: SeedRow[] = [
  ["Harriet Lindqvist", "new_opportunity", "Google LSA", "Spring Tune-Up", "not_started", 0],
  ["", "new_opportunity", "Facebook Messenger", "FB Lead Ads – Q4", "not_started", 0],
  ["Dorian Wexley", "new_opportunity", "Email", "Newsletter", "not_started", 1],
  ["Priya Ramanathan", "new_opportunity", "Website Form", "Free Estimate", "in_progress", 1],
  ["", "new_opportunity", "Google LSA", "Emergency Repair", "not_started", 2],
  ["Kasimir Brandt", "new_opportunity", "Phone Call", "Organic", "not_started", 0],
  ["Felix Arbogast", "contacted", "Phone Call", "Organic", "in_progress", 3],
  ["Noor Haddad", "contacted", "Facebook Messenger", "FB Lead Ads – Q4", "in_progress", 3],
  ["Gideon Vale", "contacted", "Google LSA", "Spring Tune-Up", "not_started", 4],
  ["Tamsin Okoro", "contacted", "Referral", "Partner Referral", "in_progress", 5],
  ["Lucia Benedetti", "first_follow_up", "Website Form", "Free Estimate", "in_progress", 6],
  ["Ansel Fairbanks", "first_follow_up", "Email", "Winter Promo", "in_progress", 7],
  ["Leontyne Hargrove", "first_follow_up", "Facebook Messenger", "Retargeting", "in_progress", 9],
  ["Wren Kowalczyk", "second_follow_up", "Google LSA", "Emergency Repair", "not_started", 8],
  ["Ozzie Marchetti", "second_follow_up", "Facebook Messenger", "Retargeting", "not_started", 10],
  ["Bettina Sorensen", "final_follow_up", "Email", "Newsletter", "in_progress", 12],
  ["", "final_follow_up", "Website Form", "Free Estimate", "not_started", 14],
  ["Ines Valcourt", "lost", "Facebook Messenger", "FB Lead Ads – Q4", "not_started", 20],
  ["Bram Holloway", "lost", "Email", "Winter Promo", "not_started", 21],
  ["Saoirse Delaney", "lost", "Google LSA", "Emergency Repair", "not_started", 22],
  ["Elio Fontaine", "lost", "Website Form", "Free Estimate", "not_started", 25],
  ["Cyrus Abernathy", "won", "Referral", "Partner Referral", "in_progress", 15],
  ["Mirela Dragan", "won", "Google LSA", "Spring Tune-Up", "in_progress", 16],
  ["Quentin Ashby", "won", "Phone Call", "Organic", "in_progress", 18],
  ["Junie Calloway", "won", "Referral", "Partner Referral", "in_progress", 28],
];

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");
}

export function buildSeedLeads(now = new Date()): Lead[] {
  const positions: Partial<Record<Stage, number>> = {};
  return ROWS.map(([name, stage, source, campaign, status, daysAgo], i) => {
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
      status,
      createdAt: created.toISOString(),
      updatedAt: created.toISOString(),
    };
  });
}
