import type { ReactNode } from "react";
import { VanMark } from "@/components/brand/van-mark";
import { cn } from "@/lib/utils";

/** Two-panel layout for sign-in pages: illustration panel + form card. */
export function AuthShell({
  title,
  subtitle,
  aside,
  children,
  tone = "customer",
}: {
  title: string;
  subtitle: string;
  aside: ReactNode;
  children: ReactNode;
  tone?: "customer" | "vendor" | "admin";
}) {
  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[0.95fr_1.05fr] md:items-start">
      <div
        className={cn(
          "relative hidden overflow-hidden rounded-[2rem] p-8 md:block",
          tone === "customer" && "bg-tomato-600 text-white",
          tone === "vendor" && "bg-espresso-900 text-crema-100",
          tone === "admin" &&
            "bg-crema-200 text-espresso-900 dark:bg-espresso-800 dark:text-crema-100",
        )}
      >
        <div className="bg-awning absolute inset-x-0 top-0 h-3 opacity-80" aria-hidden />
        <VanMark className="mt-6 h-16 w-auto drop-shadow-lg" />
        <div className="mt-8 space-y-4 text-[0.95rem] leading-relaxed">{aside}</div>
      </div>
      <div className="rounded-[2rem] border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

export function DemoCredentials({ rows }: { rows: [string, string][] }) {
  return (
    <div className="rounded-2xl border border-dashed bg-secondary/40 p-4 text-sm">
      <p className="mb-2 font-semibold">Demo credentials</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-mono text-[0.85rem] break-all select-all">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
