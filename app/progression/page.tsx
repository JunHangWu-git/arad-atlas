import Link from "next/link";
import { listProgression } from "@/lib/progression";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressionTable } from "./progression-table";

// Live data backed by the local DB — never prerender at build time.
export const dynamic = "force-dynamic";

export default async function ProgressionPage() {
  const rows = await listProgression();

  return (
    <main className="w-full px-8 py-8 flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <h1
          className="text-4xl font-bold tracking-wide"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Progression
        </h1>
        <div className="text-sm text-muted-foreground">
          <p>
            <span className="text-set">green</span> BIS ·{" "}
            <span className="text-rarity-epic">yellow</span> Tier 2 ·{" "}
            <span className="text-tier-legend">red</span> Starter
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No characters yet —{" "}
            <Link href="/" className="underline">
              add one to the roster
            </Link>{" "}
            first.
          </CardContent>
        </Card>
      ) : (
        <ProgressionTable rows={rows} />
      )}
    </main>
  );
}
