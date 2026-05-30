import { notFound } from "next/navigation";
import { getRosterCharacter } from "@/lib/roster";
import { getLatestGearSnapshot } from "@/lib/snapshot";
import { parseAvatars } from "@/lib/gear";
import { itemImageUrl } from "@/lib/neople/portrait";
import { rarityClass } from "@/lib/rarity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AvatarsPage({ params }: PageProps) {
  const { id } = await params;
  const char = await getRosterCharacter(id);
  if (!char) notFound();

  const gear = await getLatestGearSnapshot(id);
  const avatars = parseAvatars(gear?.avatar);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Avatars</CardTitle>
      </CardHeader>
      <CardContent>
        {avatars.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No avatar snapshot yet — refresh to capture avatars.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {avatars.map((a, i) => (
              <li key={a.itemId ?? i} className="flex items-center gap-2.5 py-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element -- Neople item CDN (see portrait.ts) */}
                <img
                  src={a.itemId ? itemImageUrl(a.itemId) : ""}
                  width={28}
                  height={28}
                  alt=""
                  loading="lazy"
                  className="size-7 shrink-0 rounded border border-border bg-black/20"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm leading-tight">
                    <span className={`font-medium ${rarityClass(a.itemRarity)}`}>
                      {a.itemName}
                    </span>{" "}
                    {a.slotName && (
                      <span className="text-xs text-muted-foreground">{a.slotName}</span>
                    )}
                  </p>
                  {a.note && (
                    <p className="truncate text-[11px] text-muted-foreground">{a.note}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
