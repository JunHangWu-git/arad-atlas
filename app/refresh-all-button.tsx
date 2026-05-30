"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

// Roster-page action: snapshot every character, then refresh the view.
// Sequential server-side (see /api/characters/refresh-all) so this single
// request returns once all characters are captured.
export function RefreshAllButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function refreshAll() {
    setPending(true);
    try {
      const res = await fetch("/api/characters/refresh-all", { method: "POST" });
      if (res.ok) router.refresh();
    } catch {
      // swallow — user can retry
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={refreshAll}
      disabled={pending}
      className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-1.5 text-sm font-medium transition-colors hover:border-[var(--tier-fine)] disabled:opacity-60"
    >
      <RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} />
      {pending ? "Refreshing…" : "Refresh all"}
    </button>
  );
}
