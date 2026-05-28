import { notFound } from "next/navigation";
import { getRosterCharacter } from "@/lib/roster";
import { getLatestGearSnapshot } from "@/lib/snapshot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface GearPageProps {
  params: Promise<{ id: string }>;
}

export default async function CharacterGearPage({ params }: GearPageProps) {
  const { id } = await params;
  const char = await getRosterCharacter(id);
  if (!char) notFound();

  const gear = await getLatestGearSnapshot(id);

  // Defensively extract equipment items from the blob
  interface EquipmentItem {
    slotName: string;
    itemName: string;
    itemRarity: string;
  }
  let items: EquipmentItem[] = [];
  if (gear != null) {
    const raw = gear.equipment;
    if (
      raw != null &&
      typeof raw === "object" &&
      "equipment" in raw &&
      Array.isArray((raw as { equipment: unknown }).equipment)
    ) {
      const arr = (raw as { equipment: unknown[] }).equipment;
      items = arr.flatMap((item) => {
        if (item == null || typeof item !== "object") return [];
        const obj = item as Record<string, unknown>;
        const slotName = typeof obj["slotName"] === "string" ? obj["slotName"] : "—";
        const itemName = typeof obj["itemName"] === "string" ? obj["itemName"] : "Unknown";
        const itemRarity = typeof obj["itemRarity"] === "string" ? obj["itemRarity"] : "";
        return [{ slotName, itemName, itemRarity }];
      });
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Equipment</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length > 0 ? (
            <table className="w-full text-sm">
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-1 w-32 text-muted-foreground">{item.slotName}</td>
                    <td className="py-1">{item.itemName}</td>
                    <td className="py-1 text-right">
                      {item.itemRarity && (
                        <Badge variant="secondary">{item.itemRarity}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">
              No gear snapshot yet — refresh to capture equipment.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
