import { useCallback, useEffect, useRef, useState } from "react";
import type { Lead, Stage } from "../types";
import { STAGES } from "./constants";
import { auth, AuthRequiredError, store, type LeadChange } from "./storage";

export type Columns = Record<Stage, string[]>;

/** Group lead ids by stage, sorted by position (new rows with position -1 first, newest on top). */
export function toColumns(leads: Lead[]): Columns {
  const cols = Object.fromEntries(STAGES.map((s) => [s.id, [] as string[]])) as Columns;
  [...leads]
    .sort((a, b) => a.position - b.position || b.createdAt.localeCompare(a.createdAt))
    .forEach((l) => cols[l.stage].push(l.id));
  return cols;
}

/** Give every lead a clean 0..n-1 position within its column. */
function renumber(leads: Lead[]): Lead[] {
  const cols = toColumns(leads);
  return leads.map((l) => ({ ...l, position: cols[l.stage].indexOf(l.id) }));
}

/** Which fields differ between two versions of the leads list. */
function diff(prev: Lead[], next: Lead[]): LeadChange[] {
  const prevById = new Map(prev.map((l) => [l.id, l]));
  const out: LeadChange[] = [];
  for (const lead of next) {
    const old = prevById.get(lead.id);
    if (!old) continue;
    const changes: Partial<Lead> = {};
    for (const k of Object.keys(lead) as (keyof Lead)[]) {
      if (lead[k] !== old[k]) (changes as Record<string, unknown>)[k] = lead[k];
    }
    if (Object.keys(changes).length) out.push({ id: lead.id, changes });
  }
  return out;
}

const REFRESH_MS = 60_000;

/** All lead state + syncing lives here, so the UI never talks to storage directly. */
export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [mode, setMode] = useState(store.kind);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [passwordRequired, setPasswordRequired] = useState(false);

  /** Turn an error into the right screen: login form, or a message. */
  const handleError = useCallback((e: unknown) => {
    if (e instanceof AuthRequiredError) {
      setNeedsLogin(true);
      setPasswordRequired(true);
      setError(null);
    } else {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const leadsRef = useRef<Lead[]>([]);
  const pending = useRef(0);
  const chain = useRef<Promise<void>>(Promise.resolve());

  const show = (next: Lead[]) => {
    leadsRef.current = next;
    setLeads(next);
  };

  // Saves run one after another, so a quick series of drags arrives in order.
  const queueSave = useCallback((changes: LeadChange[]) => {
    if (!changes.length) return;
    pending.current++;
    setSaving(true);
    chain.current = chain.current
      .then(() => store.save(changes))
      .then(() => {
        setError(null);
        setLastSynced(new Date());
      })
      .catch(handleError)
      .finally(() => {
        pending.current--;
        if (pending.current === 0) setSaving(false);
      });
  }, [handleError]);

  /** Show a new version of the leads and save whatever changed. */
  const commit = useCallback(
    (next: Lead[]) => {
      const changes = diff(leadsRef.current, next);
      show(next);
      queueSave(changes);
    },
    [queueSave],
  );

  /** Pull the latest rows (e.g. ones you just typed into the Sheet). */
  const refresh = useCallback(async () => {
    if (pending.current > 0) return; // don't overwrite changes that are still saving
    try {
      const raw = await store.load();
      setMode(store.kind);
      setNeedsLogin(false);
      if (pending.current > 0) return;
      const clean = renumber(raw);
      show(clean);
      setError(null);
      setLastSynced(new Date());
      // Hand-typed rows have no order yet: save the order they were given.
      queueSave(diff(raw, clean));
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(false);
    }
  }, [queueSave, handleError]);

  useEffect(() => {
    void refresh();
    void auth.passwordRequired().then(setPasswordRequired);
  }, [refresh]);

  useEffect(() => {
    if (mode !== "sheet" || needsLogin) return;
    // Coming back to this tab (e.g. from the Sheet) or every minute: check for new rows.
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(onFocus, REFRESH_MS);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
    };
  }, [refresh, mode, needsLogin]);

  const login = useCallback(
    async (password: string) => {
      await auth.login(password); // throws "Wrong password." on failure
      setNeedsLogin(false);
      setLoading(true);
      await refresh();
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    try {
      await auth.logout();
    } finally {
      show([]);
      setNeedsLogin(true);
    }
  }, []);

  /** Apply a new column layout (after drag and drop): rewrite stage + position. */
  const applyColumns = useCallback(
    (cols: Columns) => {
      const now = new Date().toISOString();
      const placement = new Map<string, { stage: Stage; position: number }>();
      (Object.keys(cols) as Stage[]).forEach((stage) =>
        cols[stage].forEach((id, position) => placement.set(id, { stage, position })),
      );
      commit(
        leadsRef.current.map((lead) => {
          const p = placement.get(lead.id);
          if (!p || (p.stage === lead.stage && p.position === lead.position)) return lead;
          return { ...lead, ...p, updatedAt: p.stage !== lead.stage ? now : lead.updatedAt };
        }),
      );
    },
    [commit],
  );

  const updateLead = useCallback(
    (id: string, changes: Partial<Lead>) => {
      const current = leadsRef.current.find((l) => l.id === id);
      if (!current) return;
      // Changing stage from the drawer puts the lead at the top of its new column.
      const position = changes.stage && changes.stage !== current.stage ? -1 : current.position;
      const next = leadsRef.current.map((l) =>
        l.id === id ? { ...l, ...changes, position, updatedAt: new Date().toISOString() } : l,
      );
      commit(renumber(next));
    },
    [commit],
  );

  const reset = useCallback(async () => {
    await store.reset?.();
    await refresh();
  }, [refresh]);

  return {
    leads,
    loading,
    saving,
    error,
    lastSynced,
    mode,
    needsLogin,
    passwordRequired,
    login,
    logout,
    refresh,
    applyColumns,
    updateLead,
    reset: mode === "demo" ? reset : undefined,
  };
}
