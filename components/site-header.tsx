"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { label: "Characters", href: "/" },
  { label: "Progression", href: "/progression" },
  { label: "Guides", href: "/guides" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 flex items-center gap-10 border-b border-border bg-background/80 px-8 py-5 backdrop-blur">
      <Link
        href="/"
        className="text-3xl font-bold tracking-wide"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Arad Atlas
      </Link>
      <nav className="flex items-center gap-7">
        {navLinks.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`text-lg transition-colors ${
                active
                  ? "text-tier-fine font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
