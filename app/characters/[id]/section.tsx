import type { ReactNode } from "react";

interface SectionProps {
  /** Blue dfogang-style section heading, e.g. "Equipment Information". */
  title: string;
  /** Optional right-aligned slot in the heading row (links, actions). */
  action?: ReactNode;
  /** When false, render children bare (no panel) — for grids that own their frame. */
  panel?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * dfogang-style content section: a bold blue heading over a dark panel. Shared
 * by every character-detail tab so the whole screen reads as one design.
 */
export function Section({
  title,
  action,
  panel = true,
  className,
  children,
}: SectionProps) {
  return (
    <section className={className}>
      <div className="mb-2.5 flex items-baseline justify-between">
        <h2 className="text-lg font-bold tracking-tight text-tier-fine">{title}</h2>
        {action}
      </div>
      {panel ? (
        <div className="rounded-xl border bg-card p-4 shadow">{children}</div>
      ) : (
        children
      )}
    </section>
  );
}
