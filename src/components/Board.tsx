import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { Lead, Stage } from "../types";
import { STAGES } from "../lib/constants";
import { toColumns, type Columns } from "../lib/useLeads";
import { Column } from "./Column";
import { LeadCardView, type DrawerTab } from "./LeadCard";

interface Props {
  leads: Lead[]; // all leads
  visibleIds: Set<string>; // leads that pass search + filters
  onColumnsChange: (cols: Columns) => void;
  onOpen: (lead: Lead, tab: DrawerTab) => void;
}

const STAGE_IDS = new Set<string>(STAGES.map((s) => s.id));

function findStage(id: string, cols: Columns): Stage | undefined {
  if (STAGE_IDS.has(id)) return id as Stage;
  return (Object.keys(cols) as Stage[]).find((stage) => cols[stage].includes(id));
}

export function Board({ leads, visibleIds, onColumnsChange, onOpen }: Props) {
  // While dragging we work on a temporary copy of the layout, then commit on drop.
  const [dragCols, setDragCols] = useState<Columns | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const leadsById = useMemo(() => Object.fromEntries(leads.map((l) => [l.id, l])), [leads]);
  const cols = dragCols ?? toColumns(leads);

  const sensors = useSensors(
    // A small distance means a simple click on Details/Conversation is not treated as a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id));
    setDragCols(toColumns(leads));
  }

  // Moving across columns: update the temporary layout live so the card shows where it will land.
  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over || !dragCols) return;
    const activeKey = String(active.id);
    const overKey = String(over.id);
    const from = findStage(activeKey, dragCols);
    const to = findStage(overKey, dragCols);
    if (!from || !to || from === to) return;

    const target = dragCols[to].filter((id) => id !== activeKey);
    const overIndex = target.indexOf(overKey);
    const insertAt = overIndex >= 0 ? overIndex : target.length;
    target.splice(insertAt, 0, activeKey);

    setDragCols({ ...dragCols, [from]: dragCols[from].filter((id) => id !== activeKey), [to]: target });
  }

  // Dropping: handle reordering within the column, then save.
  function handleDragEnd({ active, over }: DragEndEvent) {
    let next = dragCols;
    if (next && over) {
      const activeKey = String(active.id);
      const overKey = String(over.id);
      const stage = findStage(activeKey, next);
      if (stage && stage === findStage(overKey, next) && activeKey !== overKey && !STAGE_IDS.has(overKey)) {
        const list = next[stage];
        next = { ...next, [stage]: arrayMove(list, list.indexOf(activeKey), list.indexOf(overKey)) };
      }
      onColumnsChange(next);
    }
    setDragCols(null);
    setActiveId(null);
  }

  function handleDragCancel() {
    setDragCols(null);
    setActiveId(null);
  }

  const activeLead = activeId ? leadsById[activeId] : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex h-full gap-3 overflow-x-auto px-4 pb-4">
        {STAGES.map((stage) => (
          <Column
            key={stage.id}
            stage={stage}
            leads={cols[stage.id]
              .filter((id) => visibleIds.has(id))
              .map((id) => leadsById[id])
              .filter(Boolean)}
            onOpen={onOpen}
          />
        ))}
      </div>
      <DragOverlay>
        {activeLead ? (
          <LeadCardView lead={activeLead} onOpen={() => {}} overlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
