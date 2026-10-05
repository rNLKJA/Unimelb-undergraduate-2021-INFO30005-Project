import { Info } from "lucide-react";
import { getStorageMode } from "@/db/client";

/**
 * Visible only when the deployed demo runs on the ephemeral /tmp database.
 * Each serverless instance then has its own copy, so an order placed in one
 * may not show up on a vendor board served by another until DATABASE_URL
 * points at a shared (Turso) database.
 */
export async function StorageNotice() {
  const mode = await getStorageMode().catch(() => "local" as const);
  if (mode !== "ephemeral") return null;
  return (
    <div className="flex items-center justify-center gap-2 bg-espresso-800 px-4 py-1.5 text-center text-xs text-crema-100">
      <Info className="size-3.5 shrink-0" aria-hidden />
      Demo storage resets periodically — new accounts and orders are temporary and may not reach the
      other portal until shared storage is connected.
    </div>
  );
}
