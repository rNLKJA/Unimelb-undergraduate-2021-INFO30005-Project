import { Info } from "lucide-react";
import { getStorageMode } from "@/db/client";

/**
 * Visible only when the deployed demo runs on the ephemeral /tmp database.
 * Vercel serves pages, Route Handlers and the static landing page from
 * separate functions and runs several instances of each, every one with its
 * own /tmp copy, so a write made in one request (a sign-up, an order) may be
 * missing from the next. DATABASE_URL pointing at a shared (Turso) database
 * removes the problem.
 */
export async function StorageNotice() {
  const mode = await getStorageMode().catch(() => "local" as const);
  if (mode !== "ephemeral") return null;
  return (
    <aside
      aria-label="Demo storage"
      className="flex items-center justify-center gap-2 bg-espresso-800 px-4 py-1.5 text-center text-xs text-crema-100"
    >
      <Info className="size-3.5 shrink-0" aria-hidden />
      Demo mode: until shared storage is connected, new accounts and orders may not show up on the
      next page. Browsing works fully; run it locally for the full flow.
    </aside>
  );
}
