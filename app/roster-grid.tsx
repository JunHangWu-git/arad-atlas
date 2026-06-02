"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import type { RosterCharacter } from "@/lib/roster";
import { SortableCard } from "./sortable-card";

interface RosterGridProps {
  roster: RosterCharacter[];
}

// Client wrapper around the card grid that adds drag-to-reorder via a per-card
// grip handle. Uses @dnd-kit: cards are translated with CSS transforms during a
// drag (the DOM is reordered only once, on drop), which avoids the native-DnD
// bug where reordering the dragged node mid-drag cancels or glitches the drag.
export function RosterGrid({ roster }: RosterGridProps) {
  const router = useRouter();
  const [order, setOrder] = useState<RosterCharacter[]>(roster);

  // Re-sync local order whenever the server sends new data (add/delete/refresh).
  // Adjusting state during render (vs. an effect) is React's recommended pattern
  // for deriving state from props. The server component passes a fresh array
  // only on a real data change, so local drag re-renders (stable `roster`
  // identity) don't clobber the optimistic order.
  const [syncedRoster, setSyncedRoster] = useState(roster);
  if (syncedRoster !== roster) {
    setSyncedRoster(roster);
    setOrder(roster);
  }

  // PointerSensor with a small distance constraint so a click on the grip (or a
  // tap that doesn't move) still works as a click and doesn't hijack menu/link
  // interaction; drag only begins after the pointer travels 6px.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = order.findIndex((c) => c.id === active.id);
    const to = order.findIndex((c) => c.id === over.id);
    if (from === -1 || to === -1) return;

    const next = arrayMove(order, from, to);
    setOrder(next);

    const ids = next.map((c) => c.id);
    try {
      const res = await fetch("/api/characters/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) router.refresh();
    } catch {
      // Swallow — local order is preserved on screen; user can retry.
    }
  }

  return (
    <DndContext
      id="roster-grid-dnd"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={order.map((c) => c.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
          {order.map((c) => (
            <SortableCard key={c.id} character={c} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
