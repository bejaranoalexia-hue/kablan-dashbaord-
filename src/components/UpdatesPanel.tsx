import { useCallback, useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import type { LeadUpdate } from "../types";
import { formatDateTime } from "../lib/format";

export interface UpdatesApi {
  load: (leadId: string) => Promise<LeadUpdate[]>;
  add: (leadId: string, text: string) => Promise<LeadUpdate>;
  remove: (updateId: string) => Promise<void>;
}

const MAX_LENGTH = 5000;

function timeAgo(iso: string) {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (!Number.isFinite(seconds)) return "";
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

/** Write notes about a contact; each is saved with the date and time it was posted. */
export function UpdatesPanel({ leadId, api }: { leadId: string; api: UpdatesApi }) {
  const [items, setItems] = useState<LeadUpdate[] | null>(null);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await api.load(leadId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [api, leadId]);

  useEffect(() => {
    setItems(null);
    void load();
  }, [load]);

  async function post(e?: FormEvent) {
    e?.preventDefault();
    const clean = text.trim();
    if (!clean || posting) return;
    setPosting(true);
    try {
      const saved = await api.add(leadId, clean);
      setItems((prev) => [saved, ...(prev ?? [])]);
      setText("");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err)); // the text stays in the box so nothing is lost
    } finally {
      setPosting(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void post();
  }

  async function remove(update: LeadUpdate) {
    if (!confirm("Delete this update? This can't be undone.")) return;
    try {
      await api.remove(update.id);
      setItems((prev) => (prev ?? []).filter((u) => u.id !== update.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <form onSubmit={post} className="border-b border-slate-200 px-5 py-4">
        <label htmlFor="new-update" className="sr-only">
          New update
        </label>
        <textarea
          id="new-update"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
          onKeyDown={onKeyDown}
          rows={3}
          placeholder="Write an update about this contact… (e.g. “Sent my portfolio, they’ll reply next week”)"
          className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-400">Ctrl + Enter to post</span>
          <button
            type="submit"
            disabled={!text.trim() || posting}
            className="rounded-lg bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {posting ? "Posting…" : "Post update"}
          </button>
        </div>
        {error && (
          <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
            {error}
          </p>
        )}
      </form>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {items === null && !error ? (
          <p className="py-8 text-center text-sm text-slate-500">Loading updates…</p>
        ) : items && items.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm font-medium text-slate-700">No updates yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Log calls, emails and next steps here. Each update is saved with the date and time you posted it.
            </p>
          </div>
        ) : (
          <ul className="space-y-3" data-updates>
            {(items ?? []).map((u) => (
              <li key={u.id} className="group rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <time dateTime={u.time} className="text-xs font-medium text-slate-700">
                    {formatDateTime(u.time)}
                    <span className="ml-1.5 font-normal text-slate-400">· {timeAgo(u.time)}</span>
                  </time>
                  <button
                    type="button"
                    onClick={() => void remove(u)}
                    aria-label="Delete update"
                    className="rounded px-1.5 text-xs text-slate-400 opacity-60 hover:bg-rose-50 hover:text-rose-700 group-hover:opacity-100"
                  >
                    Delete
                  </button>
                </div>
                <p className="text-sm whitespace-pre-wrap break-words text-slate-800">{u.text}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
