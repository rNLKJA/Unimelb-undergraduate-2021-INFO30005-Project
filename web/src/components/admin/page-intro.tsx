import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Title block shared by the admin analysis pages. */
export function PageIntro({
  eyebrow,
  title,
  children,
  actions,
  className,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="max-w-3xl space-y-2">
        <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">{eyebrow}</p>
        <h1 className="text-3xl font-semibold">{title}</h1>
        {children ? (
          <div className="text-sm leading-relaxed text-muted-foreground">{children}</div>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

/** A titled card section on the admin analysis pages. */
export function Panel({
  id,
  title,
  subtitle,
  children,
  className,
  actions,
}: {
  id: string;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn("min-w-0 rounded-2xl border bg-card p-4 shadow-sm sm:p-5", className)}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <h2 id={id} className="text-lg font-semibold">
            {title}
          </h2>
          {subtitle ? (
            <div className="text-xs leading-relaxed text-muted-foreground">{subtitle}</div>
          ) : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** One headline figure with its interval and sample size. */
export function Figure({
  label,
  value,
  interval,
  note,
}: {
  label: string;
  value: string;
  interval?: string;
  note?: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border bg-card px-4 py-3 shadow-sm">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1">
        <span className="font-display text-2xl font-semibold">{value}</span>
        {interval ? (
          <span className="tabular ml-1.5 text-xs text-muted-foreground">95% CI {interval}</span>
        ) : null}
        {note ? <span className="mt-0.5 block text-xs text-muted-foreground">{note}</span> : null}
      </dd>
    </div>
  );
}
