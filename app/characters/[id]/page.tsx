import Link from "next/link";
import { notFound } from "next/navigation";
import { getRosterCharacter } from "@/lib/roster";
import {
  getFameHistory,
  getLatestStatusSnapshot,
  getLatestGearSnapshot,
} from "@/lib/snapshot";
import { parseEquipment, parseAvatars, parseCreature, parseStatusList } from "@/lib/gear";
import { Section } from "./section";
import { RefreshButton } from "./refresh-button";
import { FameChart } from "./fame-chart";
import { EquipmentList } from "./equipment-list";
import { ItemIconStrip } from "./item-icons";

interface OverviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function CharacterOverviewPage({
  params,
}: OverviewPageProps) {
  const { id } = await params;
  const char = await getRosterCharacter(id);
  if (!char) notFound();

  const [fame, status, gear] = await Promise.all([
    getFameHistory(id),
    getLatestStatusSnapshot(id),
    getLatestGearSnapshot(id),
  ]);

  const equipment = parseEquipment(gear?.equipment);
  const avatars = parseAvatars(gear?.avatar);
  const creature = parseCreature(gear?.creature);
  const sidekicks = creature ? [creature, ...avatars] : avatars;
  const statRows = parseStatusList(status?.status).slice(0, 12);

  const lastRefreshed =
    char.updatedAt != null
      ? new Date(char.updatedAt).toLocaleDateString()
      : "Never";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Last refreshed: {lastRefreshed}
        </p>
        <RefreshButton id={id} />
      </div>

      <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(360px,1fr))]">
        <Section
          title="Equipment"
          action={
            <Link
              href={`/characters/${id}/gear`}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              View all →
            </Link>
          }
        >
          <EquipmentList rows={equipment.slice(0, 6)} />
        </Section>

        <div className="space-y-6">
          {sidekicks.length > 0 && (
            <Section title="Avatar & Creature">
              <ItemIconStrip items={sidekicks} />
            </Section>
          )}

          <Section title="Stat Highlights">
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
          </Section>
        </div>
      </div>

      <Section title="Fame History">
        {fame.length >= 2 ? (
          <FameChart points={fame} />
        ) : (
          <p className="text-sm text-muted-foreground">
            No snapshots yet. Fame tracking begins after the first refresh.
          </p>
        )}
      </Section>
    </div>
  );
}
