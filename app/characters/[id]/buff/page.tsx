import { notFound } from "next/navigation";
import { getRosterCharacter } from "@/lib/roster";
import { getLatestStatusSnapshot } from "@/lib/snapshot";
import { parseBuffList } from "@/lib/gear";
import { Section } from "../section";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BuffPage({ params }: PageProps) {
  const { id } = await params;
  const char = await getRosterCharacter(id);
  if (!char) notFound();

  const snapshot = await getLatestStatusSnapshot(id);
  const buffs = parseBuffList(snapshot?.buff);

  if (buffs.length === 0) {
    return (
      <Section title="Buff">
        <p className="text-sm text-muted-foreground">
          No buff snapshot yet — refresh to capture buffs.
        </p>
      </Section>
    );
  }

  return (
    <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(360px,1fr))]">
      {buffs.map((buff, i) => (
        <Section
          key={i}
          title={buff.name}
          action={
            buff.level != null ? (
              <span className="font-mono text-sm text-muted-foreground">
                Lv {buff.level}
              </span>
            ) : undefined
          }
        >
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
        </Section>
      ))}
    </div>
  );
}
