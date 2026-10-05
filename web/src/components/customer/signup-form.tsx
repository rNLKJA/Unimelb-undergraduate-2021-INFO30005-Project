"use client";

import Link from "next/link";
import { useActionState } from "react";
import { customerSignupAction } from "@/app/customer/actions";
import { fieldError, FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IDLE } from "@/lib/types";

/** Port of `new-snacker.hbs` / `updateNewAccountToDB`. */
export function CustomerSignupForm({ next }: { next: string }) {
  const [state, action] = useActionState(customerSignupAction, IDLE);
  const err = (f: string) => fieldError(state, f);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            name="firstName"
            required
            autoComplete="given-name"
            aria-invalid={!!err("firstName")}
            className="h-11 rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Last name</Label>
          <Input
            id="lastName"
            name="lastName"
            required
            autoComplete="family-name"
            aria-invalid={!!err("lastName")}
            className="h-11 rounded-xl"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="customerId">Email (your login ID)</Label>
        <Input
          id="customerId"
          name="customerId"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={!!err("customerId")}
          aria-describedby={err("customerId") ? "customerId-error" : undefined}
          className="h-11 rounded-xl"
        />
        {err("customerId") ? (
          <p id="customerId-error" className="text-xs text-tomato-600 dark:text-tomato-300">
            {err("customerId")}
          </p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password1">Password</Label>
        <Input
          id="password1"
          name="password1"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          aria-invalid={!!err("password1")}
          aria-describedby="password1-hint"
          className="h-11 rounded-xl"
        />
        <p id="password1-hint" className="text-xs text-muted-foreground">
          At least 8 characters with a letter and a number; punctuation like <code>-</code> or{" "}
          <code>!</code> is welcome.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password2">Confirm password</Label>
        <Input
          id="password2"
          name="password2"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="h-11 rounded-xl"
        />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="h-12 w-full rounded-xl text-base font-semibold">
        Create a new account
      </SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        Already a snacker?{" "}
        <Link
          href={`/customer/login?next=${encodeURIComponent(next)}`}
          className="font-semibold text-primary hover:underline"
        >
          Log in
        </Link>
      </p>
    </form>
  );
}
