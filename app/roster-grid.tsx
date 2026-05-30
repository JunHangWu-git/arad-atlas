"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical } from "lucide-react";
import type { RosterCharacter } from "@/lib/roster";
import { CharacterCard } from "./character-card";

interface RosterGridProps {
  roster: RosterCharacter[];
}

// Client wrapper around the card grid that adds drag-to-reorder via a per-card
// grip handle. Reorders optimistically while dragging, then persists the new
// order (POST /api/characters/reorder) and refreshes server data on drop.
export function RosterGrid({ roster }: RosterGridProps) {
  const router = useRouter();
  const [order, setOrder] = useState<RosterCharacter[]>(roster);
  // Mirror of `order` for handlers: drag events can fire before React commits
  // the render scheduled by the last setOrder, so reading state in a closure
  // could miss the final swap. The ref always holds the latest order.
  const orderRef = useRef<RosterCharacter[]>(roster);
  const dragIndex = useRef<number | null>(null);
  const dirty = useRef(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  // Re-sync local order whenever the server sends new data (add/delete/refresh).
  // Adjusting state during render (vs. an effect) is React's recommended pattern
  // for deriving state from props and avoids an extra render pass. The server
  // component passes a fresh array only on a real data change, so local drag
  // re-renders (stable `roster` identity) don't clobber the optimistic order.
  const [syncedRoster, setSyncedRoster] = useState(roster);
  if (syncedRoster !== roster) {
    setSyncedRoster(roster);
    setOrder(roster);
    // orderRef is intentionally not written here (refs must not be mutated
    // during render). It's only read in handleDragEnd after a drag, and every
    // drag refreshes it via handleDragEnter's setOrder updater below.
  }

  function handleDragStart(i: number) {
    dragIndex.current = i;
    setDraggingIndex(i);
  }

  // Live-reorder as the dragged card moves over a new slot.
  function handleDragEnter(i: number) {
    const from = dragIndex.current;
    if (from === null || from === i) return;
    setOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(i, 0, moved);
      orderRef.current = next;
      return next;
    });
    dragIndex.current = i;
    setDraggingIndex(i);
    dirty.current = true;
  }

  async function handleDragEnd() {
    dragIndex.current = null;
    setDraggingIndex(null);
    if (!dirty.current) return;
    dirty.current = false;

    const ids = orderRef.current.map((c) => c.id);
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
    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-5">
      {order.map((c, i) => (
        <div
          key={c.id}
          onDragEnter={() => handleDragEnter(i)}
          onDragOver={(e) => e.preventDefault()}
          className={`group/cell relative transition-opacity ${
            draggingIndex === i ? "opacity-50" : ""
          }`}
        >
          <button
            type="button"
            aria-label="Drag to reorder"
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragEnd={handleDragEnd}
            className="absolute right-11 top-2.5 z-10 hidden size-8 cursor-grab place-items-center rounded-lg border border-border bg-black/50 text-foreground transition-colors hover:border-[var(--tier-fine)] active:cursor-grabbing group-hover/cell:grid"
          >
            <GripVertical className="size-4" />
          </button>
          <CharacterCard character={c} />
        </div>
      ))}
    </div>
  );
}
