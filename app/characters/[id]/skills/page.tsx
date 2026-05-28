import { notFound } from "next/navigation";
import { getRosterCharacter } from "@/lib/roster";
import { getLatestStatusSnapshot } from "@/lib/snapshot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SkillsPageProps {
  params: Promise<{ id: string }>;
}

export default async function CharacterSkillsPage({ params }: SkillsPageProps) {
  const { id } = await params;
  const char = await getRosterCharacter(id);
  if (!char) notFound();

  const status = await getLatestStatusSnapshot(id);

  // Defensively extract buff rows. The Neople `buff` field is itself the array
  // of { name, level, status[] } entries.
  interface BuffRow {
    name: string;
    level: string;
  }
  let buffRows: BuffRow[] = [];
  if (status != null && Array.isArray(status.buff)) {
    buffRows = status.buff.flatMap((item) => {
      if (item == null || typeof item !== "object") return [];
      const obj = item as Record<string, unknown>;
      const name = typeof obj["name"] === "string" ? obj["name"] : null;
      if (name == null) return [];
      const level = obj["level"] != null ? String(obj["level"]) : "—";
      return [{ name, level }];
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Buff status</CardTitle>
        </CardHeader>
        <CardContent>
          {buffRows.length > 0 ? (
            <table className="w-full text-sm">
              <tbody>
                {buffRows.map((row) => (
                  <tr key={row.name} className="border-b last:border-0">
                    <td className="py-1 text-muted-foreground">{row.name}</td>
                    <td className="py-1 text-right font-medium">Lv {row.level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">
              No skill snapshot yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
