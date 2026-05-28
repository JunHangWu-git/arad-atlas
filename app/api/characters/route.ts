import { NextResponse } from "next/server";
import { z } from "zod";
import { addCharacter, listRoster } from "@/lib/roster";
import { NeopleError } from "@/lib/neople/client";

const addCharacterSchema = z.object({
  serverId: z.string().min(1),
  characterName: z.string().min(1),
});

export async function GET(): Promise<NextResponse> {
  const data = await listRoster();
  return NextResponse.json({ success: true, data }, { status: 200 });
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = addCharacterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const { serverId, characterName } = parsed.data;

  try {
    const data = await addCharacter(serverId, characterName);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof NeopleError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: err.status },
      );
    }
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
