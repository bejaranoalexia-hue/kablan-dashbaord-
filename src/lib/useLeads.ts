import { useCallback, useEffect, useState } from "react";
import type { Lead, Stage } from "../types";
import { loadLeads, resetLeads, saveLeads } from "./storage";
import { STAGES } from "./constants";

export type Columns = Record<Stage, string[]>;

/** Group lead ids by stage, sorted by position. */
export function toColumns(leads: Lead[]): Columns {
  const cols = Object.fromEntries(STAGES.map((s) => [s.id, [] as string[]])) as Columns;
  [...leads]
    .sort((a, b) => a.position - b.position)
    .forEach((l) => cols[l.stage].push(l.id));
  return cols;
}

/** All lead state + actions live here, so the UI never touches storage directly. */
export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>(loadLeads);

  useEffect(() => saveLeads(leads), [leads]);

  /** Apply a new column layout (after drag and drop): rewrite stage + position. */
  const applyColumns = useCallback((cols: Columns) => {
    const now = new Date().toISOString();
    setLeads((prev) => {
      const placement = new Map<string, { stage: Stage; position: number }>();
      (Object.keys(cols) as Stage[]).forEach((stage) =>
        cols[stage].forEach((id, position) => placement.set(id, { stage, position })),
      );
      return prev.map((lead) => {
        const p = placement.get(lead.id);
        if (!p || (p.stage === lead.stage && p.position === lead.position)) return lead;
        return { ...lead, ...p, updatedAt: p.stage !== lead.stage ? now : lead.updatedAt };
      });
    });
  }, []);

  const updateLead = useCallback((id: string, changes: Partial<Lead>) => {
    setLeads((prev) => {
      const current = prev.find((l) => l.id === id);
      if (!current) return prev;
      // Changing stage from the drawer puts the lead at the top of its new column.
      const position = changes.stage && changes.stage !== current.stage ? -1 : current.position;
      const next = prev.map((l) =>
        l.id === id ? { ...l, ...changes, position, updatedAt: new Date().toISOString() } : l,
      );
      // Re-number positions so they stay 0..n-1 in each column.
      const cols = toColumns(next);
      return next.map((l) => ({ ...l, position: cols[l.stage].indexOf(l.id) }));
    });
  }, []);

  const reset = useCallback(() => setLeads(resetLeads()), []);

  return { leads, applyColumns, updateLead, reset };
}
