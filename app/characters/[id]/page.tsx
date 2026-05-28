import { notFound } from "next/navigation";
import { getRosterCharacter } from "@/lib/roster";
import { getFameHistory, getLatestStatusSnapshot } from "@/lib/snapshot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshButton } from "./refresh-button";
import { FameChart } from "./fame-chart";

interface OverviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function CharacterOverviewPage({
  params,
}: OverviewPageProps) {
  const { id } = await params;
  const char = await getRosterCharacter(id);
  if (!char) notFound();

  const [fame, status] = await Promise.all([
    getFameHistory(id),
    getLatestStatusSnapshot(id),
  ]);

  const lastRefreshed =
    char.updatedAt != null
      ? new Date(char.updatedAt).toLocaleDateString()
      : "Never";

  // Defensively extract stat rows. The Neople `status` field is itself the
  // array of { name, value } entries.
  let statRows: Array<{ name: string; value: string }> = [];
  if (status != null && Array.isArray(status.status)) {
    statRows = status.status.slice(0, 12).flatMap((item) => {
      if (item == null || typeof item !== "object") return [];
      const obj = item as Record<string, unknown>;
      const name = typeof obj["name"] === "string" ? obj["name"] : null;
      const value = obj["value"] != null ? String(obj["value"]) : null;
      if (name == null || value == null) return [];
      return [{ name, value }];
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Last refreshed: {lastRefreshed}
        </p>
        <RefreshButton id={id} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fame history</CardTitle>
        </CardHeader>
        <CardContent>
          {fame.length >= 2 ? (
            <FameChart points={fame} />
          ) : (
            <p className="text-sm text-muted-foreground">
              No snapshots yet. Fame tracking begins after the first refresh.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stat highlights</CardTitle>
        </CardHeader>
        <CardContent>
          {statRows.length > 0 ? (
            <table className="w-full text-sm">
              <tbody>
                {statRows.map((row) => (
                  <tr key={row.name} className="border-b last:border-0">
                    <td className="py-1 text-muted-foreground">{row.name}</td>
                    <td className="py-1 text-right font-medium">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">
              No snapshots yet. Stat tracking begins after the first refresh.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
