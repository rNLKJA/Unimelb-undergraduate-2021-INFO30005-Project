import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
  headingLevel = 3,
}: {
  icon?: ReactNode;
  title: string;
  /** Keep the document outline valid: use 2 directly under a page's h1. */
  headingLevel?: 2 | 3;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-grain flex flex-col items-center gap-3 rounded-3xl border border-dashed px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? <div className="text-muted-foreground [&_svg]:size-10">{icon}</div> : null}
      {headingLevel === 2 ? (
        <h2 className="text-lg font-semibold">{title}</h2>
      ) : (
        <h3 className="text-lg font-semibold">{title}</h3>
      )}
      {children ? <div className="max-w-sm text-sm text-muted-foreground">{children}</div> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
