import { notFound } from "next/navigation";
import { getRosterCharacter } from "@/lib/roster";
import { getLatestStatusSnapshot } from "@/lib/snapshot";
import { parseStatusList } from "@/lib/gear";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StatusPage({ params }: PageProps) {
  const { id } = await params;
  const char = await getRosterCharacter(id);
  if (!char) notFound();

  const snapshot = await getLatestStatusSnapshot(id);
  const stats = parseStatusList(snapshot?.status);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status</CardTitle>
      </CardHeader>
      <CardContent>
        {stats.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No status snapshot yet — refresh to capture stats.
          </p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {stats.map((s) => (
                <tr key={s.name} className="border-b last:border-0">
                  <td className="py-1 text-muted-foreground">{s.name}</td>
                  <td className="py-1 text-right font-medium">{s.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
