"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreVertical, Eye, RefreshCw, BookOpen, Trash2 } from "lucide-react";

interface CharacterCardMenuProps {
  id: string;
}

// 3-dot settings menu for a roster card. Rendered as a sibling overlay of the
// card's Link (never nested) so opening the menu doesn't navigate the card.
export function CharacterCardMenu({ id }: CharacterCardMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking anywhere outside the menu.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);

  async function refresh() {
    setPending("refresh");
    try {
      const res = await fetch(`/api/characters/${id}/refresh`, { method: "POST" });
      // 409 = a snapshot is already running; refreshing the view is still fine.
      if (res.ok || res.status === 409) router.refresh();
    } catch {
      // swallow — user can retry from the menu
    } finally {
      setPending(null);
      setOpen(false);
    }
  }

  async function remove() {
    setPending("delete");
    try {
      await fetch(`/api/characters/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setPending(null);
      setOpen(false);
    }
  }

  const item =
    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-card";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Character settings"
        onClick={() => setOpen((v) => !v)}
        className="grid size-8 place-items-center rounded-lg border border-border bg-black/50 text-foreground transition-colors hover:border-[var(--tier-fine)]"
      >
        <MoreVertical className="size-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-20 min-w-44 rounded-xl border border-border bg-muted p-1.5 shadow-xl">
          <Link href={`/characters/${id}`} className={item}>
            <Eye className="size-4 text-muted-foreground" /> View details
          </Link>
          <button type="button" onClick={refresh} disabled={pending !== null} className={item}>
            <RefreshCw className="size-4 text-muted-foreground" />
            {pending === "refresh" ? "Refreshing…" : "Refresh snapshot"}
          </button>
          <Link href={`/characters/${id}/guides`} className={item}>
            <BookOpen className="size-4 text-muted-foreground" /> Edit guide links
          </Link>
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            onClick={remove}
            disabled={pending !== null}
            className={`${item} text-destructive`}
          >
            <Trash2 className="size-4" />
            {pending === "delete" ? "Deleting…" : "Delete character"}
          </button>
        </div>
      )}
    </div>
  );
}
