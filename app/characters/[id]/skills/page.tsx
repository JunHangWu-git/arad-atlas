import { notFound } from "next/navigation";
import { getRosterCharacter } from "@/lib/roster";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SkillsPageProps {
  params: Promise<{ id: string }>;
}

export default async function CharacterSkillsPage({ params }: SkillsPageProps) {
  const { id } = await params;
  const char = await getRosterCharacter(id);
  if (!char) notFound();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Skills</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No skill snapshot yet.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
