import { NextResponse, type NextRequest } from "next/server";

import { NeopleError } from "@/lib/neople/client";
import { getItem } from "@/lib/neople/items";

export const revalidate = 86400;

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ itemId: string }> },
): Promise<NextResponse> {
  const { itemId } = await ctx.params;

  try {
    const data = await getItem(itemId);
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    if (err instanceof NeopleError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: err.status || 502 },
      );
    }
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
