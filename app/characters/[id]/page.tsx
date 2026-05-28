import { notFound } from "next/navigation";
import { getRosterCharacter } from "@/lib/roster";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OverviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function CharacterOverviewPage({
  params,
}: OverviewPageProps) {
  const { id } = await params;
  const char = await getRosterCharacter(id);
  if (!char) notFound();

  const lastRefreshed =
    char.updatedAt != null
      ? new Date(char.updatedAt).toLocaleDateString()
      : "Never";

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Last refreshed: {lastRefreshed}
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Fame history</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No snapshots yet. Fame tracking begins after the first refresh.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stat highlights</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No snapshots yet. Stat tracking begins after the first refresh.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
