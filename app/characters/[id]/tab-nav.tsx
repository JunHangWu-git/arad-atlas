"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface TabNavProps {
  baseHref: string;
}

const tabs = [
  { label: "Overview", path: "" },
  { label: "Equipment", path: "/gear" },
  { label: "Avatars", path: "/avatars" },
  { label: "Creatures", path: "/creatures" },
  { label: "Skills", path: "/skills" },
  { label: "Guides", path: "/guides" },
] as const;

/** dfogang-style tab strip with an active underline driven by the current path. */
export function TabNav({ baseHref }: TabNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1 border-b">
      {tabs.map((tab) => {
        const href = `${baseHref}${tab.path}`;
        const active = tab.path === "" ? pathname === baseHref : pathname === href;
        return (
          <Link
            key={tab.label}
            href={href}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "border-tier-fine text-tier-fine"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
