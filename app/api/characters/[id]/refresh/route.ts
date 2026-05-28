import { NextResponse } from "next/server";
import { snapshotCharacter } from "@/lib/snapshot";

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await ctx.params;
    const result = await snapshotCharacter(id);

    if (result.ok) {
      return NextResponse.json({ success: true, data: result }, { status: 200 });
    }

    if (result.reason === "locked") {
      return NextResponse.json(
        { success: false, error: "Already refreshing" },
        { status: 409 }
      );
    }

    if (result.reason === "not_found") {
      return NextResponse.json(
        { success: false, error: "Character not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Snapshot failed" },
      { status: 500 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
