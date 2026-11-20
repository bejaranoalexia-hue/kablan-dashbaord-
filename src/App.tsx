import { useCallback, useMemo, useState } from "react";
import type { Lead } from "./types";
import { useLeads } from "./lib/useLeads";
import { Board } from "./components/Board";
import { Toolbar, type Filters } from "./components/Toolbar";
import { LeadDrawer } from "./components/LeadDrawer";
import { SyncStatus } from "./components/SyncStatus";
import { LoginScreen } from "./components/LoginScreen";
import type { DrawerTab } from "./components/LeadCard";

function matches(lead: Lead, f: Filters) {
  if (f.priority === "none" && lead.priority) return false;
  if (f.priority && f.priority !== "none" && lead.priority !== f.priority) return false;
  const q = f.search.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, "");
  return (
    [lead.name, lead.email, lead.phone, lead.company, lead.jobPosition].some((v) => v.toLowerCase().includes(q)) ||
    (digits.length >= 3 && lead.phone.replace(/\D/g, "").includes(digits))
  );
}

export default function App() {
  const {
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
    reset,
  } = useLeads();
  const [filters, setFilters] = useState<Filters>({ search: "", priority: "" });
  const [open, setOpen] = useState<{ id: string; tab: DrawerTab } | null>(null);

  const visibleIds = useMemo(() => new Set(leads.filter((l) => matches(l, filters)).map((l) => l.id)), [leads, filters]);
  const openLead = open ? leads.find((l) => l.id === open.id) : undefined;
  const close = useCallback(() => setOpen(null), []);

  if (needsLogin) return <LoginScreen onLogin={login} />;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-sm font-bold text-white">LB</div>
        <div>
          <h1 className="text-base font-semibold text-slate-900">Lead Board</h1>
          <p className="text-xs text-slate-500">Drag leads between stages to track your job prospects</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <SyncStatus mode={mode} loading={loading} saving={saving} error={error} lastSynced={lastSynced} onRefresh={refresh} />
          {passwordRequired && (
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-lg px-3 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            >
              Log out
            </button>
          )}
        </div>
      </header>
      {error && (
        <div className="flex items-center gap-3 border-b border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800" role="alert">
          <span className="min-w-0 flex-1">{error}</span>
          <button type="button" onClick={refresh} className="rounded-md border border-rose-300 bg-white px-3 py-1 text-xs font-medium hover:bg-rose-100">
            Try again
          </button>
        </div>
      )}
      <Toolbar filters={filters} onChange={setFilters} shown={visibleIds.size} total={leads.length} onReset={reset} />
      <main className="relative min-h-0 flex-1">
        {loading && leads.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            {mode === "sheet" ? "Loading leads from your Google Sheet…" : "Loading…"}
          </div>
        ) : (
          <Board
            leads={leads}
            visibleIds={visibleIds}
            onColumnsChange={applyColumns}
            onOpen={(lead, tab) => setOpen({ id: lead.id, tab })}
          />
        )}
      </main>
      {openLead && open && (
        <LeadDrawer
          lead={openLead}
          tab={open.tab}
          onTabChange={(tab) => setOpen({ ...open, tab })}
          onSave={updateLead}
          onClose={close}
        />
      )}
    </div>
  );
}
