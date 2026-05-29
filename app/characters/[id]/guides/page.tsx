import { notFound } from "next/navigation";
import { getRosterCharacter } from "@/lib/roster";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddGuideForm, RemoveGuideButton } from "./add-guide-form";

interface GuidesPageProps {
  params: Promise<{ id: string }>;
}

export default async function CharacterGuidesPage({ params }: GuidesPageProps) {
  const { id } = await params;
  const char = await getRosterCharacter(id);
  if (!char) notFound();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Guides</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <AddGuideForm characterId={id} />
          {char.guideUrls.length > 0 ? (
            <ul className="space-y-2">
              {char.guideUrls.map((url) => (
                <li key={url} className="flex items-center">
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-600 hover:underline break-all"
                  >
                    {url}
                  </a>
                  <RemoveGuideButton characterId={id} url={url} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No guides added yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
