import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Lead } from "../types";
import { STAGE_BY_ID, STATUS_LABEL } from "../lib/constants";
import { formatDateTime } from "../lib/format";

export type DrawerTab = "details" | "conversation";

interface Props {
  lead: Lead;
  onOpen: (lead: Lead, tab: DrawerTab) => void;
  overlay?: boolean;
}

/** Visual card. Used both inside the column (sortable) and in the drag overlay. */
export function LeadCardView({ lead, onOpen, overlay }: Props) {
  const stage = STAGE_BY_ID[lead.stage];
  const inProgress = lead.status === "in_progress";
  return (
    <div
      className={`rounded-lg border border-slate-200 bg-white p-3 shadow-sm ${
        overlay ? "rotate-1 cursor-grabbing shadow-lg ring-2 ring-sky-400" : "cursor-grab hover:border-slate-300"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`truncate text-sm font-semibold ${lead.name ? "text-slate-900" : "italic text-slate-400"}`}>
            {lead.name || "No Name Provided"}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{formatDateTime(lead.createdAt)}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${stage.badge}`}>{stage.title}</span>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">{lead.source}</span>
        {lead.campaign && (
          <span className="rounded-md border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600">{lead.campaign}</span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span
          className={`flex shrink-0 items-center gap-1 text-[11px] font-medium ${inProgress ? "text-sky-700" : "text-slate-500"}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${inProgress ? "bg-sky-500" : "bg-slate-300"}`} />
          {STATUS_LABEL[lead.status]}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onOpen(lead, "details")}
          className="rounded-md border border-slate-200 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Details
        </button>
        <button
          type="button"
          onClick={() => onOpen(lead, "conversation")}
          className="rounded-md border border-slate-200 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Conversation
        </button>
      </div>
    </div>
  );
}

/** Draggable wrapper around the card. */
export function LeadCard(props: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.lead.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-40" : ""}
      data-lead-id={props.lead.id}
      {...attributes}
      {...listeners}
    >
      <LeadCardView {...props} />
    </div>
  );
}
