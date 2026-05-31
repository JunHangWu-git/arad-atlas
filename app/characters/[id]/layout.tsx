import { notFound } from "next/navigation";
import Link from "next/link";
import { getRosterCharacter } from "@/lib/roster";
import { getLatestGearSnapshot, getFameHistory } from "@/lib/snapshot";
import { parseEquipment, parseEquipmentSet } from "@/lib/gear";
import { CharHero } from "./char-hero";
import { TabNav } from "./tab-nav";

interface CharacterLayoutProps {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

export default async function CharacterLayout({
  params,
  children,
}: CharacterLayoutProps) {
  const { id } = await params;
  const char = await getRosterCharacter(id);
  if (!char) notFound();

  const [gear, fame] = await Promise.all([
    getLatestGearSnapshot(id),
    getFameHistory(id, 1),
  ]);

  const equipment = parseEquipment(gear?.equipment);
  const set = parseEquipmentSet(gear?.equipment);
  const latestFame = fame.length > 0 ? fame[fame.length - 1].fame : null;

  const baseHref = `/characters/${id}`;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-4 sm:px-6">
      <Link
        href="/"
        className="group inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:border-tier-fine hover:text-tier-fine"
      >
        <span
          aria-hidden
          className="transition-transform group-hover:-translate-x-0.5"
        >
          ←
        </span>
        Characters
      </Link>

      <CharHero char={char} equipment={equipment} set={set} fame={latestFame} />

      <TabNav baseHref={baseHref} />

      {children}
    </div>
  );
}
