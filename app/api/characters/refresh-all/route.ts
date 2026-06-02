import { NextResponse } from "next/server";
import { getAllCharacterIds, snapshotCharacter } from "@/lib/snapshot";
import { mapWithConcurrency } from "@/lib/concurrency";

const CONCURRENCY_LIMIT = 4;

// User-triggered "refresh all" from the roster page. Hits the DB + external API,
// so it must run on Node and never be cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(): Promise<NextResponse> {
  const ids = await getAllCharacterIds();

  // Bounded-parallel: at most CONCURRENCY_LIMIT characters in flight at once.
  // The token-bucket limiter in lib/neople/limiter.ts throttles network fan-out;
  // each snapshotCharacter call holds its own per-character lock internally.
  const results = await mapWithConcurrency(
    ids,
    CONCURRENCY_LIMIT,
    async (id) => {
      try {
        const result = await snapshotCharacter(id);
        return {
          id,
          ok: result.ok,
          reason: result.reason,
          errors: result.errors,
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "unknown error";
        console.error(`[characters/refresh-all] ${id}: exception ${message}`);
        return { id, ok: false, reason: "exception" };
      }
    },
  );

  const okCount = results.filter((r) => r.ok).length;

  return NextResponse.json({
    success: true,
    data: { total: results.length, ok: okCount, results },
  });
}
