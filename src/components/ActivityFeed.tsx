import { useCallback, useEffect, useState } from "react";
import type { ActivityEntry } from "../types";
import { FIELD_LABEL } from "../lib/constants";
import { formatDateTime, formatDay } from "../lib/format";

const POLL_MS = 15_000;
const DATE_FIELDS = new Set(["firstContact", "secondContact"]);

interface Props {
  leadId: string;
  load: (id: string) => Promise<ActivityEntry[]>;
  /** Changes whenever the board saves or refreshes, so the feed catches up right away. */
  refreshSignal: unknown;
}

const DOT: Record<ActivityEntry["change"], string> = {
  created: "bg-sky-500",
  stage: "bg-violet-500",
  added: "bg-emerald-500",
  changed: "bg-amber-500",
  removed: "bg-rose-500",
};

function show(field: string, value: string) {
  if (!value) return "—";
  return DATE_FIELDS.has(field) ? formatDay(value) : value;
}

function timeAgo(iso: string) {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (!Number.isFinite(seconds)) return "";
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return formatDateTime(iso);
}

function Title({ entry }: { entry: ActivityEntry }) {
  const label = FIELD_LABEL[entry.field] ?? entry.field;
  switch (entry.change) {
    case "created":
      return <>Lead added</>;
    case "stage":
      return <>Stage changed</>;
    case "added":
      return <>{label} added</>;
    case "removed":
      return <>{label} removed</>;
    default:
      return <>{label} changed</>;
  }
}

function Detail({ entry }: { entry: ActivityEntry }) {
  if (entry.change === "created") return null;
  const oldV = show(entry.field, entry.oldValue);
  const newV = show(entry.field, entry.newValue);
  if (entry.change === "added") return <span className="font-medium text-slate-800">{newV}</span>;
  if (entry.change === "removed") return <span className="text-slate-500 line-through">{oldV}</span>;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="text-slate-500 line-through">{oldV}</span>
      <span aria-hidden="true" className="text-slate-400">
        →
      </span>
      <span className="font-medium text-slate-800">{newV}</span>
    </span>
  );
}

/** A contact's change history, newest first, refreshed automatically while open. */
export function ActivityFeed({ leadId, load, refreshSignal }: Props) {
  const [entries, setEntries] = useState<ActivityEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const fetchFeed = useCallback(async () => {
    setChecking(true);
    try {
      setEntries(await load(leadId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setChecking(false);
    }
  }, [leadId, load]);

  useEffect(() => {
    void fetchFeed();
    const timer = window.setInterval(() => void fetchFeed(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [fetchFeed, refreshSignal]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-5 py-3 text-xs text-slate-500">
        <span className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${error ? "bg-rose-500" : "animate-pulse bg-emerald-500"}`} />
          {error ? "Not updating" : "Live · checks every 15 seconds"}
        </span>
        <button
          type="button"
          onClick={() => void fetchFeed()}
          disabled={checking}
          className="rounded-md px-2 py-1 font-medium text-sky-700 hover:bg-sky-50 disabled:opacity-50"
        >
          {checking ? "Checking…" : "Refresh"}
        </button>
      </div>

      {error && (
        <p className="mx-5 mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
          {error}
        </p>
      )}

      <div className="flex-1 overflow-y-auto px-5 pb-5">
        {entries === null && !error ? (
          <p className="py-10 text-center text-sm text-slate-500">Loading activity…</p>
        ) : entries && entries.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm font-medium text-slate-700">No activity yet</p>
            <p className="mt-1 text-xs text-slate-500">
              From now on, stage moves, edits and new details for this contact show up here, whether they're made on
              the board or in the Google Sheet.
            </p>
          </div>
        ) : (
          <ol className="relative ml-1 border-l border-slate-200" data-feed>
            {(entries ?? []).map((entry, i) => (
              <li key={`${entry.time}-${entry.field}-${i}`} className="relative mb-4 pl-5">
                <span className={`absolute top-1.5 -left-[5px] h-2.5 w-2.5 rounded-full ring-2 ring-white ${DOT[entry.change]}`} />
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">
                    <Title entry={entry} />
                  </p>
                  <time className="shrink-0 text-[11px] text-slate-400" dateTime={entry.time} title={formatDateTime(entry.time)}>
                    {timeAgo(entry.time)}
                  </time>
                </div>
                <div className="mt-0.5 text-sm">
                  <Detail entry={entry} />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">{entry.source === "sheet" ? "In the Google Sheet" : "On the board"}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
