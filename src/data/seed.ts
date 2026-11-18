// Invented sample data for "demo mode" (when no Google Sheet is connected).
// None of these people or companies are real.
import type { Lead, Priority, Stage } from "../types";

type SeedRow = [name: string, jobPosition: string, company: string, priority: Priority, stage: Stage, daysAgo: number];

const ROWS: SeedRow[] = [
  ["Harriet Lindqvist", "Talent Acquisition Lead", "Bluepine Analytics", "High", "new_opportunity", 0],
  ["", "Engineering Manager", "Copperleaf Studio", "Medium", "new_opportunity", 0],
  ["Dorian Wexley", "Head of Product", "Harbor & Finch", "High", "new_opportunity", 1],
  ["Priya Ramanathan", "Recruiter", "Lumen Fieldworks", "Low", "new_opportunity", 1],
  ["Kasimir Brandt", "Hiring Manager, Data", "Quarry Lane Labs", "Medium", "new_opportunity", 2],
  ["Felix Arbogast", "VP Operations", "Tidewater Logistics", "High", "contacted", 3],
  ["Noor Haddad", "Technical Recruiter", "Brightmoor Health", "Medium", "contacted", 4],
  ["Gideon Vale", "Design Director", "Saltgrass Media", "Low", "contacted", 5],
  ["Tamsin Okoro", "People Partner", "Ironbark Systems", "High", "contacted", 6],
  ["Lucia Benedetti", "Senior Recruiter", "Fernhollow Bank", "Medium", "first_follow_up", 8],
  ["Ansel Fairbanks", "CTO", "Pebblecrest Software", "High", "first_follow_up", 9],
  ["Leontyne Hargrove", "Hiring Manager", "Orchard Row Retail", "Low", "first_follow_up", 10],
  ["Wren Kowalczyk", "Talent Partner", "Starling Robotics", "Medium", "second_follow_up", 13],
  ["Ozzie Marchetti", "Engineering Lead", "Graniteview Energy", "Low", "second_follow_up", 14],
  ["Bettina Sorensen", "Director of Analytics", "Northgate Civic", "High", "final_follow_up", 18],
  ["", "Recruiting Coordinator", "Maplestone Group", "Low", "final_follow_up", 20],
  ["Ines Valcourt", "Recruiter", "Cinderpath Games", "Medium", "lost", 25],
  ["Bram Holloway", "Head of Talent", "Rivermark Insurance", "Low", "lost", 27],
  ["Cyrus Abernathy", "Product Manager", "Willowbend Labs", "High", "won", 30],
  ["Mirela Dragan", "Hiring Manager", "Sunfield Partners", "Medium", "won", 33],
];

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");
}

function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const AFTER_FIRST: Stage[] = ["contacted", "first_follow_up", "second_follow_up", "final_follow_up", "lost", "won"];
const AFTER_SECOND: Stage[] = ["second_follow_up", "final_follow_up", "lost", "won"];

export function buildSeedLeads(now = new Date()): Lead[] {
  const positions: Partial<Record<Stage, number>> = {};
  return ROWS.map(([name, jobPosition, company, priority, stage, daysAgo], i) => {
    const created = new Date(now);
    created.setDate(created.getDate() - daysAgo);
    created.setHours(8 + ((i * 3) % 10), (i * 17) % 60, 0, 0);
    const first = new Date(created);
    first.setDate(first.getDate() + 1);
    const second = new Date(first);
    second.setDate(second.getDate() + 5);
    const position = positions[stage] ?? 0;
    positions[stage] = position + 1;
    return {
      id: `demo-${i + 1}`,
      name,
      jobPosition,
      priority,
      email: name ? `${slug(name)}@example.com` : "",
      phone: `(555) 01${String(i).padStart(2, "0")}-${String(1000 + i * 37).slice(-4)}`,
      company,
      firstContact: AFTER_FIRST.includes(stage) ? isoDay(first) : "",
      secondContact: AFTER_SECOND.includes(stage) ? isoDay(second) : "",
      stage,
      position,
      createdAt: created.toISOString(),
      updatedAt: created.toISOString(),
    };
  });
}
