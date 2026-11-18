import { PRIORITIES } from "../lib/constants";

export interface Filters {
  search: string;
  priority: string; // "" = all, "none" = no priority set
}

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  shown: number;
  total: number;
  onReset?: () => void; // only in demo mode
}

const selectCls =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200";

export function Toolbar({ filters, onChange, shown, total, onReset }: Props) {
  const active = filters.search || filters.priority;
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3">
      <div className="relative min-w-60 flex-1 sm:max-w-sm">
        <svg
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 1 0 3.47 9.77l3.63 3.63a.75.75 0 1 0 1.06-1.06l-3.63-3.63A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"
            clipRule="evenodd"
          />
        </svg>
        <input
          type="search"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search name, company, email or phone"
          aria-label="Search leads"
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
        />
      </div>

      <select
        aria-label="Filter by priority"
        className={selectCls}
        value={filters.priority}
        onChange={(e) => onChange({ ...filters, priority: e.target.value })}
      >
        <option value="">All priorities</option>
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
        <option value="none">No priority</option>
      </select>

      {active && (
        <button
          type="button"
          onClick={() => onChange({ search: "", priority: "" })}
          className="rounded-lg px-3 py-2 text-sm font-medium text-sky-700 hover:bg-sky-50"
        >
          Clear filters
        </button>
      )}

      <div className="ml-auto flex items-center gap-3 text-sm text-slate-500">
        <span>
          Showing {shown} of {total}
        </span>
        {onReset && (
          <button
            type="button"
            onClick={() => {
              if (confirm("Reset the board to the sample leads? Your changes will be lost.")) onReset();
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Reset sample data
          </button>
        )}
      </div>
    </div>
  );
}
