interface Props {
  mode: "sheet" | "demo";
  loading: boolean;
  saving: boolean;
  error: string | null;
  lastSynced: Date | null;
  onRefresh: () => void;
}

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

/** Small pill in the header showing where data lives and whether it's saved. */
export function SyncStatus({ mode, loading, saving, error, lastSynced, onRefresh }: Props) {
  if (mode === "demo") {
    return (
      <span
        className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200"
        title="No Google Sheet connected. See SHEET_SETUP.md."
      >
        Demo data · not connected to a Google Sheet
      </span>
    );
  }

  let dot = "bg-emerald-500";
  let label = lastSynced ? `Google Sheet · synced ${timeFmt.format(lastSynced)}` : "Google Sheet";
  if (loading) {
    dot = "bg-sky-500 animate-pulse";
    label = "Loading from Google Sheet…";
  } else if (saving) {
    dot = "bg-sky-500 animate-pulse";
    label = "Saving to Google Sheet…";
  } else if (error) {
    dot = "bg-rose-500";
    label = "Google Sheet · not synced";
  }

  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        {label}
      </span>
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading || saving}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        title="Pull new rows from the Sheet"
      >
        Refresh
      </button>
    </div>
  );
}
