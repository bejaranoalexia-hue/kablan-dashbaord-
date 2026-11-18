import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Lead } from "../types";
import type { StageInfo } from "../lib/constants";
import { LeadCard, type DrawerTab } from "./LeadCard";

interface Props {
  stage: StageInfo;
  leads: Lead[];
  onOpen: (lead: Lead, tab: DrawerTab) => void;
}

export function Column({ stage, leads, onOpen }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <section className="flex h-full w-72 shrink-0 flex-col rounded-xl bg-slate-200/60" data-stage={stage.id}>
      <header className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${stage.accent}`} />
          <h2 className="text-sm font-semibold text-slate-800">{stage.title}</h2>
          <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600" data-count>
            {leads.length}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">{stage.subtitle}</p>
      </header>
      <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto rounded-b-xl px-2 pb-3 transition-colors ${
            isOver ? "bg-sky-100/70" : ""
          }`}
        >
          {leads.length === 0 ? (
            <div className="mt-1 rounded-lg border border-dashed border-slate-300 py-6 text-center text-xs text-slate-400">
              No leads
            </div>
          ) : (
            leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} onOpen={onOpen} />
            ))
          )}
        </div>
      </SortableContext>
    </section>
  );
}
