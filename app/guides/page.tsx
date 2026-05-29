import Link from "next/link";
import { listRoster } from "@/lib/roster";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function GuidesPage() {
  const roster = await listRoster();

  return (
    <main className="max-w-4xl mx-auto p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Guides</h1>
        <Link href="/roster" className="text-sm text-muted-foreground hover:underline">
          ← Roster
        </Link>
      </div>

      {roster.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No characters yet —{" "}
            <Link href="/roster" className="underline">
              add one to the roster
            </Link>{" "}
            first.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {roster.map((char) => (
            <Card key={char.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">
                  <Link
                    href={`/characters/${char.id}/guides`}
                    className="hover:underline"
                  >
                    {char.characterName}
                  </Link>
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {char.jobName ? `${char.jobName} · ` : ""}{char.serverId}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {char.guideUrls.length > 0 ? (
                  <ul className="space-y-1">
                    {char.guideUrls.map((url) => (
                      <li key={url}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-blue-600 hover:underline break-all"
                        >
                          {url}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No guides yet.{" "}
                    <Link
                      href={`/characters/${char.id}/guides`}
                      className="underline"
                    >
                      Add one
                    </Link>
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
