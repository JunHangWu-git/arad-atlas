import { notFound } from "next/navigation";
import { getRosterCharacter } from "@/lib/roster";
import { getLatestGearSnapshot } from "@/lib/snapshot";
import { parseEquipment, parseBuffEquipment } from "@/lib/gear";
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
  const rows = parseEquipment(gear?.equipment);
  const buff = parseBuffEquipment(gear?.buffEquipment);

  return (
    <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(360px,1fr))]">
      <Section title="Equipment Information">
        <EquipmentList rows={rows} />
      </Section>

      <Section title="Buff Enhancement">
        <BuffEnhancementPanel data={buff} />
      </Section>
    </div>
  );
}
