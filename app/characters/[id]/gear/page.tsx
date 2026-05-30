import { notFound } from "next/navigation";
import { getRosterCharacter } from "@/lib/roster";
import { getLatestGearSnapshot } from "@/lib/snapshot";
import { parseEquipment } from "@/lib/gear";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EquipmentList } from "../equipment-list";

interface GearPageProps {
  params: Promise<{ id: string }>;
}

export default async function CharacterGearPage({ params }: GearPageProps) {
  const { id } = await params;
  const char = await getRosterCharacter(id);
  if (!char) notFound();

  const gear = await getLatestGearSnapshot(id);
  const rows = parseEquipment(gear?.equipment);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Equipment</CardTitle>
        </CardHeader>
        <CardContent>
          <EquipmentList rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
