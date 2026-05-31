import { notFound } from "next/navigation";
import { getRosterCharacter } from "@/lib/roster";
import { getLatestStatusSnapshot } from "@/lib/snapshot";
import { parseBuffList } from "@/lib/gear";
import { Section } from "../section";

interface SkillsPageProps {
  params: Promise<{ id: string }>;
}

export default async function CharacterSkillsPage({ params }: SkillsPageProps) {
  const { id } = await params;
  const char = await getRosterCharacter(id);
  if (!char) notFound();

  const status = await getLatestStatusSnapshot(id);
  const buffs = parseBuffList(status?.buff);

  return (
    <Section title="Buff Status">
      {buffs.length > 0 ? (
        <table className="w-full text-sm">
          <tbody>
            {buffs.map((buff) => (
              <tr key={buff.name} className="border-b last:border-0">
                <td className="py-1 text-muted-foreground">{buff.name}</td>
                <td className="py-1 text-right font-medium">
                  Lv {buff.level ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-muted-foreground">No skill snapshot yet.</p>
      )}
    </Section>
  );
}
