import { notFound } from "next/navigation";
import { getRosterCharacter } from "@/lib/roster";
import { getLatestGearSnapshot } from "@/lib/snapshot";
import { parseCreature, parseArtifacts } from "@/lib/gear";
import { itemImageUrl } from "@/lib/neople/portrait";
import { rarityClass } from "@/lib/rarity";
import { Section } from "../section";
import { ItemIconStrip } from "../item-icons";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CreaturesPage({ params }: PageProps) {
  const { id } = await params;
  const char = await getRosterCharacter(id);
  if (!char) notFound();

  const gear = await getLatestGearSnapshot(id);
  const creature = parseCreature(gear?.creature);
  const artifacts = parseArtifacts(gear?.creature);

  return (
    <Section title="Creature">
      {creature == null ? (
        <p className="text-sm text-muted-foreground">
          No creature snapshot yet — refresh to capture it.
        </p>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- Neople item CDN (see portrait.ts) */}
            <img
              src={creature.itemId ? itemImageUrl(creature.itemId) : ""}
              width={36}
              height={36}
              alt=""
              loading="lazy"
              className="size-9 shrink-0 rounded border border-border bg-black/20"
            />
            <p className={`font-medium ${rarityClass(creature.itemRarity)}`}>
              {creature.itemName}
            </p>
          </div>

          {artifacts.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Artifacts</p>
              <ItemIconStrip items={artifacts} />
            </div>
          )}
        </div>
      )}
    </Section>
  );
}
