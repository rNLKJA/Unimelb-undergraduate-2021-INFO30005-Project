"use client";

import { KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAi } from "./ai-provider";

/** Opens the bring-your-own-key AI settings; a dot shows when a key is set. */
export function AiSettingsButton({ className }: { className?: string }) {
  const { openSettings, storedKey, ready } = useAi();
  const active = ready && storedKey !== null;
  return (
    <button
      type="button"
      onClick={openSettings}
      aria-label={active ? "AI settings (your key is set)" : "AI settings (bring your own key)"}
      title="AI settings"
      className={cn(
        "relative inline-flex size-8 items-center justify-center rounded-lg transition-colors",
        className,
      )}
    >
      <KeyRound className="size-4" aria-hidden />
      {active ? (
        <span
          aria-hidden
          className="absolute top-1 right-1 size-2 rounded-full bg-honey-400 ring-2 ring-espresso-900"
        />
      ) : null}
    </button>
  );
}
