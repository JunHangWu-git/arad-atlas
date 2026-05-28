"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface RefreshButtonProps {
  id: string;
}

export function RefreshButton({ id }: RefreshButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleRefresh() {
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/characters/${id}/refresh`, { method: "POST" });
      if (res.status === 409) {
        setMessage("Already refreshing…");
        return;
      }
      if (!res.ok) {
        setMessage("Refresh failed. Try again.");
        return;
      }
      router.refresh();
    } catch {
      setMessage("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button onClick={handleRefresh} disabled={pending} size="sm">
        {pending ? "Refreshing…" : "Refresh now"}
      </Button>
      {message && <span className="text-sm text-muted-foreground">{message}</span>}
    </div>
  );
}
