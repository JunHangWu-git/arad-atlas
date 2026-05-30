import { notFound } from "next/navigation";
import Link from "next/link";
import { getRosterCharacter } from "@/lib/roster";
import { portraitUrl } from "@/lib/neople/portrait";

interface CharacterLayoutProps {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

const tabs = [
  { label: "Overview", path: "" },
  { label: "Gear", path: "/gear" },
  { label: "Skills", path: "/skills" },
  { label: "Guides", path: "/guides" },
] as const;

export default async function CharacterLayout({
  params,
  children,
}: CharacterLayoutProps) {
  const { id } = await params;
  const char = await getRosterCharacter(id);
  if (!char) notFound();

  const baseHref = `/characters/${id}`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- Neople CDN portrait; next/image cannot proxy its query params (see plan Risk #8) */}
        <img
          src={portraitUrl(char.serverId, char.characterId)}
          width={64}
          height={64}
          alt={char.characterName}
          className="rounded"
        />
        <div>
          <h1 className="text-2xl font-bold">{char.characterName}</h1>
          <p className="text-sm text-muted-foreground">
            {[
              char.jobGrowName ?? char.jobName,
              char.jobGrowName && char.jobName ? char.jobName : null,
              char.level != null ? `Lv ${char.level}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {(char.adventureName ?? char.guildName) && (
            <p className="text-sm text-muted-foreground">
              {[char.adventureName, char.guildName ? `[${char.guildName}]` : null]
                .filter(Boolean)
                .join(" ")}
            </p>
          )}
        </div>
      </div>

      {/* Tab nav */}
      <nav className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={`${baseHref}${tab.path}`}
            className="px-4 py-2 text-sm font-medium hover:text-foreground text-muted-foreground"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
