import Link from "next/link";
import { listRoster } from "@/lib/roster";
import { portraitUrl } from "@/lib/neople/portrait";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { AddCharacterForm, DeleteButton } from "./add-character-form";

// Roster is per-deployment live data backed by the local DB — never prerender it
// at build time (the DB/table may not exist during build).
export const dynamic = "force-dynamic";

export default async function RosterPage() {
  const roster = await listRoster();

  return (
    <main className="max-w-5xl mx-auto p-8 flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Roster</h1>
      <AddCharacterForm />
      {roster.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No characters yet — add one above.
          </CardContent>
        </Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Portrait</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Server</TableHead>
              <TableHead>Job</TableHead>
              <TableHead>Level</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roster.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <img
                    src={portraitUrl(c.serverId, c.characterId)}
                    alt={c.characterName}
                    width={48}
                    height={48}
                    className="rounded"
                  />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/characters/${c.id}`}
                    className="font-medium hover:underline"
                  >
                    {c.characterName}
                  </Link>
                </TableCell>
                <TableCell>{c.serverId}</TableCell>
                <TableCell>{c.jobName ?? "—"}</TableCell>
                <TableCell>{c.level ?? "—"}</TableCell>
                <TableCell>
                  <DeleteButton id={c.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </main>
  );
}
