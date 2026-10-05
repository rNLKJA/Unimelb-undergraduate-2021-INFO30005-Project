"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { demoLoginAction } from "@/app/demo-actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Submit({
  children,
  className,
  variant,
}: {
  children: ReactNode;
  className?: string;
  variant?: "default" | "outline" | "secondary";
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      className={className}
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
      {children}
    </Button>
  );
}

type DemoRole = "customer" | "vendor" | "admin";

/** One-click demo sign-in (Server Action). */
export function DemoLoginButton({
  role,
  next,
  children,
  className,
  formClassName = "contents",
  variant = "default",
  autoSubmit = false,
}: {
  role: DemoRole;
  next?: string;
  children: ReactNode;
  className?: string;
  /** The wrapping <form> is `display: contents` by default so the button sits in flex rows. */
  formClassName?: string;
  variant?: "default" | "outline" | "secondary";
  /** Sign in straight away (used when arriving from a {@link DemoLoginLink}). */
  autoSubmit?: boolean;
}) {
  const form = useRef<HTMLFormElement>(null);
  const submitted = useRef(false);
  useEffect(() => {
    if (!autoSubmit || submitted.current) return;
    submitted.current = true;
    form.current?.requestSubmit();
  }, [autoSubmit]);
  return (
    <form ref={form} action={demoLoginAction} className={cn(formClassName)}>
      <input type="hidden" name="role" value={role} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Submit className={className} variant={variant}>
        {children}
      </Submit>
    </form>
  );
}

/**
 * One-click demo sign-in from a statically rendered page (the landing page).
 * A Server Action posted from a static page runs in a different Vercel
 * function from the dynamic pages, so without a shared database its demo
 * top-up would land in the wrong /tmp copy. Instead this links to the portal's
 * login page, which signs in straight away (`?demo=1`).
 */
export function DemoLoginLink({
  role,
  children,
  className,
  variant = "default",
}: {
  role: DemoRole;
  children: ReactNode;
  className?: string;
  variant?: "default" | "outline" | "secondary";
}) {
  return (
    <Button asChild variant={variant} className={className}>
      <Link href={`/${role}/login?demo=1`}>{children}</Link>
    </Button>
  );
}
