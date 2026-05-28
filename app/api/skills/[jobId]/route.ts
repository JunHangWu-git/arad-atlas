import { NextResponse, type NextRequest } from "next/server";

import { NeopleError } from "@/lib/neople/client";
import { getSkills } from "@/lib/neople/jobs";

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ jobId: string }> },
): Promise<NextResponse> {
  const jobGrowId = request.nextUrl.searchParams.get("jobGrowId");

  if (!jobGrowId) {
    return NextResponse.json(
      { success: false, error: "jobGrowId query parameter is required" },
      { status: 400 },
    );
  }

  const { jobId } = await ctx.params;

  try {
    const data = await getSkills(jobId, jobGrowId);
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
