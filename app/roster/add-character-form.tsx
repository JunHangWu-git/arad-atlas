"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AddCharacterForm() {
  const router = useRouter();
  const [serverId, setServerId] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ serverId, characterName }),
      });
      const json: unknown = await res.json();
      if (
        typeof json === "object" &&
        json !== null &&
        "success" in json &&
        !(json as { success: boolean }).success
      ) {
        const msg =
          "error" in json && typeof (json as { error: unknown }).error === "string"
            ? (json as { error: string }).error
            : "Failed to add character.";
        setError(msg);
      } else {
        setServerId("");
        setCharacterName("");
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-md">
      <div className="flex gap-2">
        <Input
          placeholder="Server (e.g. cain)"
          value={serverId}
          onChange={(e) => setServerId(e.target.value)}
          required
          disabled={pending}
        />
        <Input
          placeholder="Character name"
          value={characterName}
          onChange={(e) => setCharacterName(e.target.value)}
          required
          disabled={pending}
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add"}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}

interface DeleteButtonProps {
  id: string;
}

export function DeleteButton({ id }: DeleteButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    setPending(true);
    try {
      await fetch(`/api/characters/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={pending}
    >
      {pending ? "…" : "Delete"}
    </Button>
  );
}
