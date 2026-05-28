import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getAllCharacterIds, snapshotCharacter } from "@/lib/snapshot";

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
  const results: { id: string; ok: boolean; reason?: string; errors?: string[] }[] =
    [];

  // Sequential: each snapshotCharacter call respects its own per-char lock and
  // we avoid hammering the Neople API in parallel.
  for (const id of ids) {
    try {
      const result = await snapshotCharacter(id);
      results.push({
        id,
        ok: result.ok,
        reason: result.reason,
        errors: result.errors,
      });
      console.info(
        `[cron/snapshot-all] ${id}: ok=${result.ok}` +
          (result.reason ? ` reason=${result.reason}` : "") +
          (result.errors?.length ? ` errors=${result.errors.join(",")}` : ""),
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "unknown error";
      results.push({ id, ok: false, reason: "exception" });
      console.error(`[cron/snapshot-all] ${id}: exception ${message}`);
    }
  }

  const okCount = results.filter((r) => r.ok).length;
  console.info(
    `[cron/snapshot-all] done: ${okCount}/${results.length} succeeded`,
  );

  return NextResponse.json({
    success: true,
    data: { total: results.length, ok: okCount, results },
  });
}
