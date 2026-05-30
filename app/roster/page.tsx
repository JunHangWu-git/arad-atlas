import { redirect } from "next/navigation";

// The roster grid now lives at the site root (`/`). This route is kept only so
// old bookmarks/links don't 404 — it permanently forwards to `/`.
export const dynamic = "force-dynamic";

export default function RosterPage() {
  redirect("/");
}
