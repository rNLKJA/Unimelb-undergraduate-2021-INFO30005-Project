"use client";

import { LogOut } from "lucide-react";
import { vendorLogoutAction } from "@/app/vendor/actions";
import { forgetSessionKeys } from "@/lib/ai/settings";

/**
 * Log out of the vendor portal. The demo vendor login is public and shared,
 * so logging out also clears any AI key kept for this tab only; a key the
 * visitor chose to remember on this device stays until "Forget key".
 */
export function VendorLogoutButton() {
  return (
    <form
      action={vendorLogoutAction}
      onSubmit={() => {
        try {
          forgetSessionKeys(window.sessionStorage);
        } catch {
          // Storage unavailable (private mode): nothing was stored there either.
        }
      }}
    >
      <button
        type="submit"
        aria-label="Log out"
        className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-crema-200 hover:bg-white/10 hover:text-white"
      >
        <LogOut className="size-4" aria-hidden />
        <span className="hidden sm:inline">Log out</span>
      </button>
    </form>
  );
}
