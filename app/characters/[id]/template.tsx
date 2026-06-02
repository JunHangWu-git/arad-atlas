"use client";

import { useEffect } from "react";

/**
 * Reset the window scroll to the top whenever the user lands on a character
 * page. App Router's automatic scroll-to-top is defeated here because this
 * segment has a `loading.tsx`: the instant loading skeleton changes the
 * document height during the navigation commit, so the window keeps the
 * roster's scroll offset and the character page opens mid-scroll.
 *
 * A `template.tsx` (unlike `layout.tsx`) re-mounts on every navigation into the
 * segment, so this effect fires each time a character page is opened — including
 * navigating between two different characters. It does NOT re-run on tab
 * switches (gear/skills/etc.), which are a deeper segment change and leave this
 * template mounted, and it does not affect back-button scroll restoration to the
 * roster (that never mounts this template).
 */
export default function CharacterTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return <>{children}</>;
}
