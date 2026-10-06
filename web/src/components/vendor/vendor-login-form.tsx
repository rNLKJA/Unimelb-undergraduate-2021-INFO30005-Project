"use client";

import { useActionState } from "react";
import { vendorLoginAction } from "@/app/vendor/actions";
import { FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IDLE } from "@/lib/types";

/** Port of `vendor-login.hbs`: vans sign in with their name (van_id) and password. */
export function VendorLoginForm({ vanNames }: { vanNames: string[] }) {
  const [state, action] = useActionState(vendorLoginAction, IDLE);
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="vanId">Van ID</Label>
        <Input
          id="vanId"
          name="vanId"
          required
          list="van-names"
          autoComplete="username"
          placeholder="e.g. Ardeth Lavon"
          className="h-11 rounded-xl"
        />
        <datalist id="van-names">
          {vanNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
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
      <SubmitButton className="h-12 w-full rounded-xl bg-espresso-900 text-base font-semibold text-crema-100 hover:bg-espresso-800 dark:bg-crema-200 dark:text-espresso-900">
        Log in to the van
      </SubmitButton>
    </form>
  );
}
