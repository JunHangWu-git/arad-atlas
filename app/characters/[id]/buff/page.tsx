import { notFound } from "next/navigation";
import { getRosterCharacter } from "@/lib/roster";
import { getLatestStatusSnapshot } from "@/lib/snapshot";
import { parseBuffList } from "@/lib/gear";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BuffPage({ params }: PageProps) {
  const { id } = await params;
  const char = await getRosterCharacter(id);
  if (!char) notFound();

  const snapshot = await getLatestStatusSnapshot(id);
  const buffs = parseBuffList(snapshot?.buff);

  return (
    <div className="space-y-4">
      {buffs.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            No buff snapshot yet — refresh to capture buffs.
          </CardContent>
        </Card>
      ) : (
        buffs.map((buff, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle className="flex items-baseline gap-2">
                {buff.name}
                {buff.level != null && (
                  <span className="font-mono text-sm font-normal text-muted-foreground">
                    Lv {buff.level}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {buff.status.length > 0 ? (
                <table className="w-full text-sm">
                  <tbody>
                    {buff.status.map((s) => (
                      <tr key={s.name} className="border-b last:border-0">
                        <td className="py-1 text-muted-foreground">{s.name}</td>
                        <td className="py-1 text-right font-medium">{s.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-muted-foreground">No stats.</p>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
