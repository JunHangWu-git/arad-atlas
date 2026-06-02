import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getAllCharacterIds, snapshotCharacter } from "@/lib/snapshot";
import { mapWithConcurrency } from "@/lib/concurrency";

const CONCURRENCY_LIMIT = 4;

// Snapshot capture hits the DB + external API — must run on Node, never cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (!header) return false;

  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on length mismatch — compare lengths first.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAuthorized(request.headers.get("authorization"))) {
    return new NextResponse("unauthorized", { status: 401 });
  }

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
        console.info(
          `[cron/snapshot-all] ${id}: ok=${result.ok}` +
            (result.reason ? ` reason=${result.reason}` : "") +
            (result.errors?.length ? ` errors=${result.errors.join(",")}` : ""),
        );
        return {
          id,
          ok: result.ok,
          reason: result.reason,
          errors: result.errors,
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "unknown error";
        console.error(`[cron/snapshot-all] ${id}: exception ${message}`);
        return { id, ok: false, reason: "exception" };
      }
    },
  );

  const okCount = results.filter((r) => r.ok).length;
  console.info(
    `[cron/snapshot-all] done: ${okCount}/${results.length} succeeded`,
  );

  return NextResponse.json({
    success: true,
    data: { total: results.length, ok: okCount, results },
  });
}
