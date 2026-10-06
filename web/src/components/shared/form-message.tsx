import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { ActionState } from "@/lib/types";
import { cn } from "@/lib/utils";

export function FormMessage({ state, className }: { state: ActionState; className?: string }) {
  if (state.status === "idle") return null;
  const ok = state.status === "ok";
  return (
    <p
      role={ok ? "status" : "alert"}
      className={cn(
        "flex items-start gap-2 rounded-xl px-3 py-2 text-sm",
        ok
          ? "bg-matcha-300/25 text-matcha-600 dark:text-matcha-300"
          : "bg-tomato-300/20 text-tomato-700 dark:text-tomato-300",
        className,
      )}
    >
      {ok ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
      ) : (
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      )}
      <span>{state.message}</span>
    </p>
  );
}

export function fieldError(state: ActionState, field: string): string | undefined {
  return state.status === "error" ? state.fields?.[field] : undefined;
}
