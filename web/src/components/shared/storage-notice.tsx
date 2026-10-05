import { Info } from "lucide-react";
import { getStorageMode } from "@/db/client";

/**
 * Visible only when the deployed demo runs on the ephemeral /tmp database
 * (no DATABASE_URL on Vercel). Pages, their Server Actions and the live
 * polling all run in one Vercel function, so a visitor's orders and sign-ups
 * show up across the app while that function stays warm, but the copy resets
 * on a cold start and parallel instances don't share it. A shared (Turso)
 * database removes both limits.
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
      Demo mode: new accounts and orders live in temporary storage that resets from time to time.
    </aside>
  );
}
