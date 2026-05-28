import { NextResponse } from "next/server";
import { getRosterCharacter, deleteCharacter } from "@/lib/roster";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const data = await getRosterCharacter(id);
  if (!data) {
    return NextResponse.json(
      { success: false, error: "Character not found" },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true, data }, { status: 200 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  await deleteCharacter(id);
  return NextResponse.json({ success: true, data: null }, { status: 200 });
}
