import Link from "next/link";
import { listRosterWithFame } from "@/lib/roster";
import { getSnapshotHealth } from "@/lib/snapshot";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AddCharacterForm } from "./roster/add-character-form";
import { RosterGrid } from "./roster-grid";
import { RefreshAllButton } from "./refresh-all-button";

// Per-deployment live data backed by the local DB — never prerender at build
// time (the DB/table may not exist during build).
export const dynamic = "force-dynamic";

export default async function Home() {
  const [roster, health] = await Promise.all([
    listRosterWithFame(),
    getSnapshotHealth(),
  ]);

  const staleLabel = Number.isFinite(health.maxAgeMs)
    ? `Snapshots stale (${Math.round(health.maxAgeMs / (60 * 60 * 1000))}h ago)`
    : "Snapshots never captured";

  // Explorer Club (account) name — shared across a roster, so use the first
  // non-empty adventureName. Falls back to a generic title when unknown.
  const accountName =
    roster.find((c) => c.adventureName && c.adventureName.trim() !== "")
      ?.adventureName ?? "Your Characters";

  return (
    <main className="w-full px-8 py-8 flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <h1
          className="text-4xl font-bold tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {accountName}
        </h1>
        {!health.ok && health.characterCount > 0 && (
          <Badge variant="destructive">{staleLabel}</Badge>
        )}
        <div className="ml-auto flex items-center gap-4">
          <AddCharacterForm />
          {roster.length > 0 && <RefreshAllButton />}
          <Link
            href="/guides"
            className="text-sm text-muted-foreground hover:underline"
          >
            Guides →
          </Link>
        </div>
      </div>

      {roster.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No characters yet — add one above.
          </CardContent>
        </Card>
      ) : (
        <RosterGrid roster={roster} />
      )}
    </main>
  );
}
