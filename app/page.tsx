import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
      <h1 className="text-4xl font-bold tracking-tight">Arad Atlas</h1>
      <p className="text-lg text-muted-foreground">
        Track your DFO characters across servers.
      </p>
      <Button asChild>
        <Link href="/roster">View Roster</Link>
      </Button>
    </main>
  );
}
