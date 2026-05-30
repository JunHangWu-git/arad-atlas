import { notFound } from "next/navigation";
import Link from "next/link";
import { getRosterCharacter } from "@/lib/roster";

interface CharacterLayoutProps {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

const tabs = [
  { label: "Overview", path: "" },
  { label: "Equipment", path: "/gear" },
  { label: "Avatars", path: "/avatars" },
  { label: "Creatures", path: "/creatures" },
  { label: "Buff", path: "/buff" },
  { label: "Status", path: "/status" },
  { label: "Skills", path: "/skills" },
  { label: "Guides", path: "/guides" },
] as const;

// Deterministic tint per character — matches the roster card monogram tile.
// (DFO Global API has no character portrait image; the endpoint 404s.)
function tintHue(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
}

export default async function CharacterLayout({
  params,
  children,
}: CharacterLayoutProps) {
  const { id } = await params;
  const char = await getRosterCharacter(id);
  if (!char) notFound();

  const baseHref = `/characters/${id}`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        ← Characters
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded text-xl font-bold text-white/90"
          style={{ backgroundColor: `hsl(${tintHue(char.id)} 45% 22%)` }}
          aria-hidden
        >
          {char.characterName.trim().charAt(0).toUpperCase() || "?"}
        </div>
        <div>
          <h1 className="text-xl font-bold">{char.characterName}</h1>
          <p className="text-xs text-muted-foreground">
            {[
              char.jobGrowName ?? char.jobName,
              char.jobGrowName && char.jobName ? char.jobName : null,
              char.level != null ? `Lv ${char.level}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {(char.adventureName ?? char.guildName) && (
            <p className="text-xs text-muted-foreground">
              {[char.adventureName, char.guildName ? `[${char.guildName}]` : null]
                .filter(Boolean)
                .join(" ")}
            </p>
          )}
        </div>
      </div>

      {/* Tab nav */}
      <nav className="flex flex-wrap gap-1 border-b">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={`${baseHref}${tab.path}`}
            className="px-2.5 py-1.5 text-xs font-medium hover:text-foreground text-muted-foreground"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
