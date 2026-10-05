import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shown on every sign-up / sign-in form of the public demo. */
export function DemoBanner({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-2xl border border-honey-400/60 bg-honey-300/25 px-3.5 py-2.5 text-sm text-espresso-800 dark:bg-honey-400/10 dark:text-honey-300",
        className,
      )}
    >
      <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        <strong className="font-semibold">Demo site — don&apos;t enter real personal data.</strong>{" "}
        Accounts and orders are visible in the public records area.
      </span>
    </p>
  );
}
