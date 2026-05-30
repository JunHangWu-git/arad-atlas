import Link from "next/link";
import { listRosterWithFame } from "@/lib/roster";
import { getSnapshotHealth } from "@/lib/snapshot";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AddCharacterForm } from "./roster/add-character-form";
import { CharacterCard } from "./character-card";
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

  // Roster summary stats for the meta-row (fame/level may be null per char).
  const fameFmt = new Intl.NumberFormat("en-US");
  const totalFame = roster.reduce((t, c) => t + (c.fame ?? 0), 0);
  const levels = roster
    .map((c) => c.level)
    .filter((l): l is number => l != null);
  const avgLevel =
    levels.length > 0
      ? Math.round(levels.reduce((t, l) => t + l, 0) / levels.length)
      : 0;

  return (
    <main className="w-full px-8 py-8 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <span
          className="inline-block size-3 rounded-sm"
          style={{ backgroundColor: "var(--fame)" }}
          aria-hidden
        />
        <h1 className="text-3xl font-bold tracking-tight">Your Characters</h1>
        {!health.ok && health.characterCount > 0 && (
          <Badge variant="destructive">{staleLabel}</Badge>
        )}
        <div className="ml-auto flex items-center gap-4">
          {roster.length > 0 && <RefreshAllButton />}
          <Link
            href="/guides"
            className="text-sm text-muted-foreground hover:underline"
          >
            Guides →
          </Link>
        </div>
      </div>

      {roster.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-border py-2.5 text-xs text-muted-foreground">
          <span>
            Characters{" "}
            <b className="font-mono font-semibold text-foreground">
              {roster.length}
            </b>
          </span>
          <span>
            Total fame{" "}
            <b className="font-mono font-semibold text-foreground">
              {fameFmt.format(totalFame)}
            </b>
          </span>
          <span>
            Avg level{" "}
            <b className="font-mono font-semibold text-foreground">{avgLevel}</b>
          </span>
        </div>
      )}

      <AddCharacterForm />

      {roster.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No characters yet — add one above.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-5">
          {roster.map((c) => (
            <CharacterCard key={c.id} character={c} />
          ))}
        </div>
      )}
    </main>
  );
}
