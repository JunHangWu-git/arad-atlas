"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { setShortLabel } from "@/lib/set-icon";
import { setTierColor } from "@/lib/rarity";
import type { MetricStatus, ProgressionMetric, ProgressionRow } from "@/lib/progression";

interface ProgressionTableProps {
  rows: ProgressionRow[];
}

const STATUS_CLASS: Record<MetricStatus, string> = {
  done: "text-set",
  partial: "text-rarity-epic",
  todo: "text-tier-legend",
  teal: "text-rarity-chronicle",
  none: "text-muted-foreground",
};

function MetricCell({ metric }: { metric: ProgressionMetric }) {
  return (
    <TableCell className="text-center font-mono tabular-nums">
      <span className={STATUS_CLASS[metric.status]}>{metric.label}</span>
    </TableCell>
  );
}

/** Uncolored metric cell (plain foreground), e.g. buff level. */
function PlainMetricCell({ metric }: { metric: ProgressionMetric }) {
  return (
    <TableCell className="text-center font-mono tabular-nums">
      {metric.label}
    </TableCell>
  );
}

/** C.A.T cell (creature/aura/title): the Atk. Amp. value, color-tiered, with the
 *  equipped item name on hover. */
function AmpCell({ metric }: { metric: ProgressionMetric }) {
  return (
    <TableCell className="whitespace-nowrap">
      <span
        className={`tabular-nums ${STATUS_CLASS[metric.status]}`}
        title={metric.tooltip ?? metric.label}
      >
        {metric.label}
      </span>
    </TableCell>
  );
}

export function ProgressionTable({ rows }: ProgressionTableProps) {
  const router = useRouter();
  const [order, setOrder] = useState<ProgressionRow[]>(rows);

  // Re-sync local order whenever the server sends new data (note edits, refresh).
  // Deriving state from props during render is React's recommended pattern; the
  // server passes a fresh array only on real data change, so local drag
  // re-renders (stable `rows` identity) don't clobber the optimistic order.
  const [syncedRows, setSyncedRows] = useState(rows);
  if (syncedRows !== rows) {
    setSyncedRows(rows);
    setOrder(rows);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = order.findIndex((r) => r.id === active.id);
    const to = order.findIndex((r) => r.id === over.id);
    if (from === -1 || to === -1) return;

    const next = arrayMove(order, from, to);
    setOrder(next);

    try {
      const res = await fetch("/api/progression/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: next.map((r) => r.id) }),
      });
      if (res.ok) router.refresh();
    } catch {
      // Swallow — local order is preserved on screen; user can retry.
    }
  }

  const itemIds = useMemo(() => order.map((r) => r.id), [order]);

  return (
    <DndContext
      id="progression-dnd"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Character</TableHead>
            <TableHead className="text-right">Fame</TableHead>
            <TableHead>Set</TableHead>
            <TableHead>Creature</TableHead>
            <TableHead>Aura</TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="text-center">Enchant</TableHead>
            <TableHead className="text-center">Buff</TableHead>
            <TableHead className="min-w-48">Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            {order.map((row) => (
              <ProgressionTableRow key={row.id} row={row} />
            ))}
          </SortableContext>
        </TableBody>
      </Table>
    </DndContext>
  );
}

function ProgressionTableRow({ row }: { row: ProgressionRow }) {
  const router = useRouter();
  const [note, setNote] = useState<string>(row.note ?? "");
  const [saving, setSaving] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Persist the note. Sends the current (drag-assigned) priority unchanged so a
  // note edit never disturbs the manual order.
  async function saveNote(nextNote: string) {
    if (nextNote === (row.note ?? "")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/characters/${row.id}/progression`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priority: row.priority,
          note: nextNote.trim() === "" ? null : nextNote,
        }),
      });
      if (res.ok) router.refresh();
    } catch {
      // Swallow — local edit remains on screen; user can retry on next blur.
    } finally {
      setSaving(false);
    }
  }

  const subtitle = [row.jobGrowName ?? row.jobName, row.level ? `Lv${row.level}` : null]
    .filter(Boolean)
    .join(" · ");

  const setShort = setShortLabel(row.setName);

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`${saving ? "opacity-60" : ""} ${isDragging ? "relative z-20 opacity-80" : ""}`}
    >
      <TableCell className="px-1">
        <button
          type="button"
          aria-label={`Drag to reorder ${row.characterName}`}
          {...attributes}
          {...listeners}
          className="grid size-7 cursor-grab touch-none place-items-center rounded text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>
      </TableCell>

      <TableCell>
        <Link
          href={`/characters/${row.id}`}
          className="font-medium hover:underline"
        >
          {row.characterName}
        </Link>
        {subtitle && (
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        )}
        {!row.hasSnapshot && (
          <div className="text-xs text-tier-legend">No snapshot yet</div>
        )}
      </TableCell>

      <TableCell className="text-right font-mono tabular-nums text-fame">
        {row.fame != null ? row.fame.toLocaleString() : "—"}
      </TableCell>

      <TableCell>
        {setShort ? (
          <div
            className="flex items-baseline gap-2 font-mono text-xs"
            style={{ color: setTierColor(row.setRarityName) }}
          >
            <span title={row.setName ?? undefined}>{setShort}</span>
            <span>{row.setPoint.label}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>

      <AmpCell metric={row.creature} />
      <AmpCell metric={row.aura} />
      <AmpCell metric={row.title} />

      <MetricCell metric={row.enchant} />
      <PlainMetricCell metric={row.buff} />

      <TableCell>
        <Input
          type="text"
          aria-label={`Notes for ${row.characterName}`}
          placeholder="What to improve…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => saveNote(note)}
          className="h-8"
        />
      </TableCell>
    </TableRow>
  );
}
