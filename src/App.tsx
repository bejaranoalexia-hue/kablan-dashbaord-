import { useCallback, useMemo, useState } from "react";
import type { Lead } from "./types";
import { useLeads } from "./lib/useLeads";
import { Board } from "./components/Board";
import { Toolbar, type Filters } from "./components/Toolbar";
import { LeadDrawer } from "./components/LeadDrawer";
import type { DrawerTab } from "./components/LeadCard";

function matches(lead: Lead, f: Filters) {
  if (f.source && lead.source !== f.source) return false;
  const q = f.search.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, "");
  return (
    lead.name.toLowerCase().includes(q) ||
    lead.email.toLowerCase().includes(q) ||
    lead.phone.toLowerCase().includes(q) ||
    (digits.length >= 3 && lead.phone.replace(/\D/g, "").includes(digits))
  );
}

export default function App() {
  const { leads, applyColumns, updateLead, reset } = useLeads();
  const [filters, setFilters] = useState<Filters>({ search: "", source: "" });
  const [open, setOpen] = useState<{ id: string; tab: DrawerTab } | null>(null);

  const visibleIds = useMemo(() => new Set(leads.filter((l) => matches(l, filters)).map((l) => l.id)), [leads, filters]);
  const openLead = open ? leads.find((l) => l.id === open.id) : undefined;
  const close = useCallback(() => setOpen(null), []);

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-sm font-bold text-white">LB</div>
        <div>
          <h1 className="text-base font-semibold text-slate-900">Lead Board</h1>
          <p className="text-xs text-slate-500">Drag leads between stages to track your pipeline</p>
        </div>
      </header>
      <Toolbar filters={filters} onChange={setFilters} shown={visibleIds.size} total={leads.length} onReset={reset} />
      <main className="min-h-0 flex-1">
        <Board
          leads={leads}
          visibleIds={visibleIds}
          onColumnsChange={applyColumns}
          onOpen={(lead, tab) => setOpen({ id: lead.id, tab })}
        />
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
