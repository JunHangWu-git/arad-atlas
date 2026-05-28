import { NextResponse } from "next/server";
import { getSnapshotHealth } from "@/lib/snapshot";

// Reads live DB state — never cache.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const health = await getSnapshotHealth();

  // maxAgeMs can be Infinity (a character has no snapshot yet); JSON cannot
  // represent it, so emit null in that case.
  const maxAgeMs = Number.isFinite(health.maxAgeMs) ? health.maxAgeMs : null;

  return NextResponse.json(
    {
      ok: health.ok,
      maxAgeMs,
      characterCount: health.characterCount,
    },
    { status: health.ok ? 200 : 503 },
  );
}
