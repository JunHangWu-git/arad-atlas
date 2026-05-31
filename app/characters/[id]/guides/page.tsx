import { notFound } from "next/navigation";
import { getRosterCharacter } from "@/lib/roster";
import { Section } from "../section";
import { AddGuideForm, RemoveGuideButton } from "./add-guide-form";

interface GuidesPageProps {
  params: Promise<{ id: string }>;
}

export default async function CharacterGuidesPage({ params }: GuidesPageProps) {
  const { id } = await params;
  const char = await getRosterCharacter(id);
  if (!char) notFound();

  return (
    <Section title="Guides">
      <div className="space-y-4">
        <AddGuideForm characterId={id} />
        {char.guideUrls.length > 0 ? (
          <ul className="space-y-2">
            {char.guideUrls.map((url) => (
              <li key={url} className="flex items-center">
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-sm text-tier-fine hover:underline"
                >
                  {url}
                </a>
                <RemoveGuideButton characterId={id} url={url} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No guides added yet.</p>
        )}
      </div>
    </Section>
  );
}
