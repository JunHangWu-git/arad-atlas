import { notFound } from "next/navigation";
import { getRosterCharacter } from "@/lib/roster";
import { getLatestGearSnapshot } from "@/lib/snapshot";
import {
  parseEquipment,
  splitEquipmentList,
  parseBuffEquipment,
  parseBuffAvatars,
  parseBuffCreatures,
} from "@/lib/gear";
import { Section } from "../section";
import { EquipmentList } from "../equipment-list";
import { BuffEnhancementPanel } from "../buff-enhancement";

interface GearPageProps {
  params: Promise<{ id: string }>;
}

export default async function CharacterGearPage({ params }: GearPageProps) {
  const { id } = await params;
  const char = await getRosterCharacter(id);
  if (!char) notFound();

  const gear = await getLatestGearSnapshot(id);
  const { left, right } = splitEquipmentList(parseEquipment(gear?.equipment));
  const buff = parseBuffEquipment(gear?.buffEquipment);
  const buffAvatars = parseBuffAvatars(gear?.buffAvatar);
  const buffCreatures = parseBuffCreatures(gear?.buffCreature);

  return (
    <div className="space-y-6">
      <Section title="Equipment Information">
        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          <EquipmentList rows={left} />
          <EquipmentList rows={right} />
        </div>
      </Section>

      <Section title="Buff Enhancement">
        <BuffEnhancementPanel
          data={buff}
          avatars={buffAvatars}
          creatures={buffCreatures}
        />
      </Section>
    </div>
  );
}
