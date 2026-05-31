import { notFound } from "next/navigation";
import { getRosterCharacter } from "@/lib/roster";
import { getLatestGearSnapshot } from "@/lib/snapshot";
import { parseAvatarsDetailed, type AvatarSlot } from "@/lib/gear";
import { Section } from "../section";
import { AvatarCard } from "../avatar-card";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AvatarsPage({ params }: PageProps) {
  const { id } = await params;
  const char = await getRosterCharacter(id);
  if (!char) notFound();

  const gear = await getLatestGearSnapshot(id);
  const avatars = parseAvatarsDetailed(gear?.avatar);

  // dfogang layout: Weapon + Aura anchor the left rail; the rest fill a 3x3 grid.
  const bySlot = new Map(avatars.map((s) => [s.slotName, s]));
  const LEFT_SLOTS = ["Weapon Avatar", "Aura Avatar"];
  const GRID_SLOTS = [
    "Hair Avatar",
    "Hat Avatar",
    "Face Avatar",
    "Torso Avatar",
    "Top Avatar",
    "Skin Avatar",
    "Waist Avatar",
    "Bottom Avatar",
    "Shoes Avatar",
  ];
  const left = LEFT_SLOTS.map((n) => bySlot.get(n)).filter((s): s is AvatarSlot => s != null);
  const grid = GRID_SLOTS.map((n) => bySlot.get(n)).filter((s): s is AvatarSlot => s != null);

  return (
    <Section title="Avatars & Emblems" panel={false}>
      {avatars.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No avatar snapshot yet — refresh to capture avatars.
        </p>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="flex flex-col gap-4 lg:w-72 lg:shrink-0">
            {left.map((slot) => (
              <AvatarCard key={slot.slotName} slot={slot} />
            ))}
          </div>
          <div className="grid flex-1 gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {grid.map((slot) => (
              <AvatarCard key={slot.slotName} slot={slot} />
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}
