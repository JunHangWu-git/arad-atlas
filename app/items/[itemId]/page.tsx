import { getItem } from "@/lib/neople/items";

export const revalidate = 86400;
import { rarityClass } from "@/lib/rarity";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PageProps {
  params: Promise<{ itemId: string }>;
}

export default async function ItemPage({ params }: PageProps) {
  const { itemId } = await params;
  const item = await getItem(itemId);

  const scalarFields: Array<{ label: string; value: unknown }> = [
    { label: "Item ID", value: item.itemId },
    { label: "Type", value: item.itemType },
    { label: "Type Detail", value: item.itemTypeDetail },
    { label: "Available Level", value: item.itemAvailableLevel },
    { label: "Fame", value: item.fame },
    { label: "Set Item", value: item.setItemName },
  ].filter(
    (f) => f.value !== undefined && f.value !== null && f.value !== ""
  );

  return (
    <main className="max-w-2xl mx-auto p-8">
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <CardTitle className={`text-2xl ${rarityClass(item.itemRarity)}`}>{item.itemName}</CardTitle>
          <Badge>{item.itemRarity}</Badge>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {scalarFields.map((f) => (
              <div key={f.label} className="contents">
                <dt className="text-muted-foreground font-medium">{f.label}</dt>
                <dd>{String(f.value)}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </main>
  );
}
