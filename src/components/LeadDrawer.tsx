import { useEffect, useState, type ReactNode } from "react";
import type { ActivityEntry, Lead, Priority, Stage } from "../types";
import { PRIORITIES, STAGES, STAGE_BY_ID } from "../lib/constants";
import { formatDateTime } from "../lib/format";
import type { DrawerTab } from "./LeadCard";
import { ActivityFeed } from "./ActivityFeed";

interface Props {
  lead: Lead;
  tab: DrawerTab;
  onTabChange: (tab: DrawerTab) => void;
  onSave: (id: string, changes: Partial<Lead>) => void;
  loadActivity: (id: string) => Promise<ActivityEntry[]>;
  refreshSignal: unknown;
  onClose: () => void;
}

const EDITABLE: (keyof Lead)[] = [
  "name",
  "jobPosition",
  "company",
  "email",
  "phone",
  "stage",
  "priority",
  "firstContact",
  "secondContact",
];

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

export function LeadDrawer({ lead, tab, onTabChange, onSave, onClose, loadActivity, refreshSignal }: Props) {
  const [draft, setDraft] = useState<Lead>(lead);

  // If a different lead is opened, reset the form. (Keyed on id so a background
  // refresh from the Sheet doesn't wipe what you're typing.)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setDraft(lead), [lead.id]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = <K extends keyof Lead>(key: K, value: Lead[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const edited: Partial<Lead> = {};
  for (const k of EDITABLE) {
    const value = typeof draft[k] === "string" ? (draft[k] as string).trim() : draft[k];
    if (value !== lead[k]) (edited as Record<string, unknown>)[k] = value;
  }
  const dirty = Object.keys(edited).length > 0;

  function save() {
    onSave(lead.id, edited);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label="Lead details">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <header className="border-b border-slate-200 px-5 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className={`truncate text-lg font-semibold ${lead.name ? "text-slate-900" : "italic text-slate-400"}`}>
                {lead.name || "No Name Provided"}
              </h2>
              <p className="text-xs text-slate-500">
                <span className={`mr-2 rounded-full px-2 py-0.5 font-medium ${STAGE_BY_ID[lead.stage].badge}`}>
                  {STAGE_BY_ID[lead.stage].title}
                </span>
                Created {formatDateTime(lead.createdAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>
          <nav className="mt-3 flex gap-4 text-sm">
            {(
              [
                ["details", "Details"],
                ["feed", "Live feed"],
              ] as const
            ).map(([t, label]) => (
              <button
                key={t}
                type="button"
                onClick={() => onTabChange(t)}
                className={`-mb-px border-b-2 pb-2 font-medium ${
                  tab === t ? "border-sky-600 text-sky-700" : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </header>

        {tab === "details" ? (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <Field label="Contacts Name">
                <input className={inputCls} value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="No Name Provided" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Job Position">
                  <input className={inputCls} value={draft.jobPosition} onChange={(e) => set("jobPosition", e.target.value)} />
                </Field>
                <Field label="Company">
                  <input className={inputCls} value={draft.company} onChange={(e) => set("company", e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Email">
                  <input className={inputCls} type="email" value={draft.email} onChange={(e) => set("email", e.target.value)} />
                </Field>
                <Field label="Phone Number">
                  <input className={inputCls} type="tel" value={draft.phone} onChange={(e) => set("phone", e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Stage">
                  <select className={inputCls} value={draft.stage} onChange={(e) => set("stage", e.target.value as Stage)}>
                    {STAGES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Priority">
                  <select className={inputCls} value={draft.priority} onChange={(e) => set("priority", e.target.value as Priority)}>
                    <option value="">None</option>
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Day of First Contact">
                  <input className={inputCls} type="date" value={draft.firstContact} onChange={(e) => set("firstContact", e.target.value)} />
                </Field>
                <Field label="Day of Second Contact">
                  <input className={inputCls} type="date" value={draft.secondContact} onChange={(e) => set("secondContact", e.target.value)} />
                </Field>
              </div>
              <dl className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-xs">
                <div>
                  <dt className="text-slate-500">Created</dt>
                  <dd className="font-medium text-slate-700">{formatDateTime(lead.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Last updated</dt>
                  <dd className="font-medium text-slate-700">{formatDateTime(lead.updatedAt)}</dd>
                </div>
              </dl>
            </div>
            <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={!dirty}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Save changes
              </button>
            </footer>
          </>
        ) : (
          <ActivityFeed leadId={lead.id} load={loadActivity} refreshSignal={refreshSignal} />
        )}
      </aside>
    </div>
  );
}
