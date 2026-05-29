import { NextResponse } from "next/server";
import { z } from "zod";
import { addGuideUrl, removeGuideUrl } from "@/lib/roster";

export const runtime = "nodejs";

const guideUrlSchema = z.object({
  url: z.string().min(1, "url is required"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = guideUrlSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  try {
    const data = await addGuideUrl(id, parsed.data.url);
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith("Character not found:")) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 404 },
      );
    }
    if (
      err instanceof Error &&
      (err.message.startsWith("Guide URL must") )
    ) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = guideUrlSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  try {
    const data = await removeGuideUrl(id, parsed.data.url);
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith("Character not found:")) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
