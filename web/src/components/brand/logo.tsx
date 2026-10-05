import Link from "next/link";
import { cn } from "@/lib/utils";
import { VanMark } from "./van-mark";

export function Logo({
  href = "/",
  className,
  subtitle,
}: {
  href?: string;
  className?: string;
  subtitle?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("group inline-flex items-center gap-2.5 rounded-xl outline-none", className)}
      aria-label={subtitle ? `Snacks in a Van ${subtitle}` : "Snacks in a Van home"}
    >
      <VanMark className="h-8 w-auto shrink-0 transition-transform duration-300 group-hover:-translate-x-0.5 group-hover:-rotate-3" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.15rem] font-semibold tracking-tight text-brand">
          Snacks in a Van
        </span>
        {subtitle ? (
          <span className="mt-0.5 text-[0.7rem] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            {subtitle}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
