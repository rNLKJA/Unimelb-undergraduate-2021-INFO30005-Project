"use client";

import { useActionState } from "react";
import { adminLoginAction } from "@/app/admin/actions";
import { FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IDLE } from "@/lib/types";

export function AdminLoginForm() {
  const [state, action] = useActionState(adminLoginAction, IDLE);
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
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
    </form>
  );
}
