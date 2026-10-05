"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
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

/** One-click demo sign-in (Server Action). */
export function DemoLoginButton({
  role,
  next,
  children,
  className,
  formClassName = "contents",
  variant = "default",
}: {
  role: "customer" | "vendor" | "admin";
  next?: string;
  children: ReactNode;
  className?: string;
  /** The wrapping <form> is `display: contents` by default so the button sits in flex rows. */
  formClassName?: string;
  variant?: "default" | "outline" | "secondary";
}) {
  return (
    <form action={demoLoginAction} className={cn(formClassName)}>
      <input type="hidden" name="role" value={role} />
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Submit className={className} variant={variant}>
        {children}
      </Submit>
    </form>
  );
}
