import { Info } from "lucide-react";
import { getStorageMode } from "@/db/client";

/**
 * Visible only when the deployed demo runs on the ephemeral /tmp database.
 * Each serverless instance then has its own copy, so a write made in one
 * request (a sign-up, an order) may be missing from the next request if
 * another instance serves it. DATABASE_URL pointing at a shared (Turso)
 * database removes the problem.
 */
export async function StorageNotice() {
  const mode = await getStorageMode().catch(() => "local" as const);
  if (mode !== "ephemeral") return null;
  return (
    <div className="flex items-center justify-center gap-2 bg-espresso-800 px-4 py-1.5 text-center text-xs text-crema-100">
      <Info className="size-3.5 shrink-0" aria-hidden />
      Demo storage resets periodically — and until shared storage is connected, new accounts and
      orders may not show up on the next page. Browsing works fully; run it locally for the full
      flow.
    </div>
  );
}
