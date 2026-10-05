import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Visible label on every piece of model output. `edited` marks text the
 * vendor rewrote: still an AI draft, but no longer the model's own words.
 */
export function AiBadge({
  model,
  edited = false,
  className,
}: {
  model?: string;
  edited?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full flex-wrap items-center gap-x-1 rounded-xl border border-honey-400/60 bg-honey-300/25 px-2 py-0.5 text-[0.7rem] font-semibold text-espresso-800 dark:bg-honey-400/10 dark:text-honey-300",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        <Sparkles className="size-3" aria-hidden />
        {edited ? "AI draft, edited by the vendor" : "AI-generated"}
      </span>
      {model ? <span className="font-mono font-normal break-all opacity-80">· {model}</span> : null}
    </span>
  );
}
