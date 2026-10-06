"use client";

import Link from "next/link";
import { useActionState } from "react";
import { customerLoginAction } from "@/app/customer/actions";
import { FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IDLE } from "@/lib/types";

export function CustomerLoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(customerLoginAction, IDLE);
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <div className="space-y-1.5">
        <Label htmlFor="customerId">Snacker ID (email)</Label>
        <Input
          id="customerId"
          name="customerId"
          type="email"
          required
          autoComplete="username"
          className="h-11 rounded-xl"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="h-11 rounded-xl"
        />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="h-12 w-full rounded-xl text-base font-semibold">Log in</SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link
          href={`/customer/signup?next=${encodeURIComponent(next)}`}
          className="font-semibold text-primary hover:underline"
        >
          Become a snacker
        </Link>
      </p>
    </form>
  );
}
