import { useEffect, useState, type ReactNode } from "react";
import type { Lead, LeadStatus, Stage } from "../types";
import { SOURCES, STAGES, STAGE_BY_ID, STATUS_LABEL } from "../lib/constants";
import { formatDateTime } from "../lib/format";
import type { DrawerTab } from "./LeadCard";

interface Props {
  lead: Lead;
  tab: DrawerTab;
  onTabChange: (tab: DrawerTab) => void;
  onSave: (id: string, changes: Partial<Lead>) => void;
  onClose: () => void;
}

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

export function LeadDrawer({ lead, tab, onTabChange, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<Lead>(lead);

  // If a different lead is opened, reset the form.
  useEffect(() => setDraft(lead), [lead]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = <K extends keyof Lead>(key: K, value: Lead[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(lead);
  const sources = SOURCES.includes(draft.source) ? SOURCES : [draft.source, ...SOURCES];

  function save() {
    const { name, email, phone, stage, source, campaign, status } = draft;
    onSave(lead.id, { name: name.trim(), email: email.trim(), phone: phone.trim(), stage, source, campaign: campaign.trim(), status });
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
            {(["details", "conversation"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onTabChange(t)}
                className={`-mb-px border-b-2 pb-2 font-medium capitalize ${
                  tab === t ? "border-sky-600 text-sky-700" : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {t}
              </button>
            ))}
          </nav>
        </header>

        {tab === "details" ? (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <Field label="Name">
                <input className={inputCls} value={draft.name} onChange={(e) => set("name", e.target.value)} placeholder="No Name Provided" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Email">
                  <input className={inputCls} type="email" value={draft.email} onChange={(e) => set("email", e.target.value)} />
                </Field>
                <Field label="Phone">
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
                <Field label="Status">
                  <select className={inputCls} value={draft.status} onChange={(e) => set("status", e.target.value as LeadStatus)}>
                    {(Object.keys(STATUS_LABEL) as LeadStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Source">
                  <select className={inputCls} value={draft.source} onChange={(e) => set("source", e.target.value)}>
                    {sources.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Campaign">
                  <input className={inputCls} value={draft.campaign} onChange={(e) => set("campaign", e.target.value)} />
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
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <div className="mb-3 rounded-full bg-slate-100 p-3 text-slate-400">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M2 5a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H8.4l-3.7 3.1A.75.75 0 0 1 3.5 16.5V14A3 3 0 0 1 2 11.4V5Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-700">No messages yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Conversation history will show up here once lead intake (email, Messenger, etc.) is connected.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
