import { NextResponse } from "next/server";
import { getAllCharacterIds, snapshotCharacter } from "@/lib/snapshot";

// User-triggered "refresh all" from the roster page. Hits the DB + external API,
// so it must run on Node and never be cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(): Promise<NextResponse> {
  const ids = await getAllCharacterIds();

  const results: { id: string; ok: boolean; reason?: string; errors?: string[] }[] =
    [];

  // Sequential: each snapshotCharacter respects its own per-char lock and we
  // avoid hammering the Neople API in parallel (mirrors the cron route).
  for (const id of ids) {
    try {
      const result = await snapshotCharacter(id);
      results.push({
        id,
        ok: result.ok,
        reason: result.reason,
        errors: result.errors,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "unknown error";
      results.push({ id, ok: false, reason: "exception" });
      console.error(`[characters/refresh-all] ${id}: exception ${message}`);
    }
  }

  const okCount = results.filter((r) => r.ok).length;

  return NextResponse.json({
    success: true,
    data: { total: results.length, ok: okCount, results },
  });
}
