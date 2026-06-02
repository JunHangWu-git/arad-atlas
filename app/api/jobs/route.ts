import { NextResponse } from "next/server";

import { NeopleError } from "@/lib/neople/client";
import { getJobs } from "@/lib/neople/jobs";

export const revalidate = 86400;

export async function GET(): Promise<NextResponse> {
  try {
    const data = await getJobs();
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
