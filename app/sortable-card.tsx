"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { RosterCharacter } from "@/lib/roster";
import { CharacterCard } from "./character-card";

interface SortableCardProps {
  character: RosterCharacter;
}

// One draggable cell in the roster grid. Drag is initiated only from the grip
// handle ({...listeners} live on the button, not the cell), so card links and
// the 3-dot menu stay clickable. dnd-kit applies a CSS transform during the
// drag; the actual array reorder happens once on drop (see RosterGrid).
export function SortableCard({ character }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: character.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/cell relative ${isDragging ? "z-20 opacity-50" : ""}`}
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
        className="absolute left-2.5 top-2.5 z-10 hidden size-8 cursor-grab touch-none place-items-center rounded-lg border border-border bg-black/50 text-foreground transition-colors hover:border-[var(--tier-fine)] active:cursor-grabbing group-hover/cell:grid"
      >
        <GripVertical className="size-4" />
      </button>
      <CharacterCard character={character} />
    </div>
  );
}
