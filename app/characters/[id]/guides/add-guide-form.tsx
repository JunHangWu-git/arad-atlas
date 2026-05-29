"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AddGuideFormProps {
  characterId: string;
}

export function AddGuideForm({ characterId }: AddGuideFormProps) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/characters/${characterId}/guides`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
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
            : "Failed to add guide URL.";
        setError(msg);
      } else {
        setUrl("");
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-xl">
      <div className="flex gap-2">
        <Input
          placeholder="https://example.com/guide"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
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

interface RemoveGuideButtonProps {
  characterId: string;
  url: string;
}

export function RemoveGuideButton({ characterId, url }: RemoveGuideButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleRemove() {
    setPending(true);
    try {
      await fetch(`/api/characters/${characterId}/guides`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={handleRemove}
      disabled={pending}
      className="ml-2 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
      aria-label="Remove guide"
      type="button"
    >
      {pending ? "…" : "×"}
    </button>
  );
}
