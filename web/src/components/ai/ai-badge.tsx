import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/** Visible label on every piece of model output. */
export function AiBadge({ model, className }: { model?: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full flex-wrap items-center gap-x-1 rounded-xl border border-honey-400/60 bg-honey-300/25 px-2 py-0.5 text-[0.7rem] font-semibold text-espresso-800 dark:bg-honey-400/10 dark:text-honey-300",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        <Sparkles className="size-3" aria-hidden />
        AI-generated
      </span>
      {model ? <span className="font-mono font-normal break-all opacity-80">· {model}</span> : null}
    </span>
  );
}
