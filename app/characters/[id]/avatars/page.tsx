import { notFound } from "next/navigation";
import { getRosterCharacter } from "@/lib/roster";
import { getLatestGearSnapshot } from "@/lib/snapshot";
import { parseAvatarsDetailed } from "@/lib/gear";
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

  return (
    <Section title="Avatars & Emblems" panel={false}>
      {avatars.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No avatar snapshot yet — refresh to capture avatars.
        </p>
      ) : (
        <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(190px,1fr))]">
          {avatars.map((slot, i) => (
            <AvatarCard key={slot.itemId ?? i} slot={slot} />
          ))}
        </div>
      )}
    </Section>
  );
}
