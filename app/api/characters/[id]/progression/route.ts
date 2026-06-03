import { NextResponse } from "next/server";
import { z } from "zod";
import { getRosterCharacter } from "@/lib/roster";
import { upsertProgressionNote } from "@/lib/progression";

const noteSchema = z.object({
  // Priority: positive int rank (lower = higher priority), or null to clear.
  priority: z.number().int().min(1).max(999).nullable(),
  // Note: freeform text, trimmed; empty string is normalized to null.
  note: z
    .string()
    .max(500)
    .nullable()
    .transform((v) => {
      if (v == null) return null;
      const t = v.trim();
      return t === "" ? null : t;
    }),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  const char = await getRosterCharacter(id);
  if (!char) {
    return NextResponse.json(
      { success: false, error: "Character not found" },
      { status: 404 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid request",
      },
      { status: 400 },
    );
  }

  try {
    await upsertProgressionNote(id, parsed.data);
    return NextResponse.json({ success: true, data: null }, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
