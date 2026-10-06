"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePasswordAction } from "@/app/customer/actions";
import { fieldError, FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IDLE } from "@/lib/types";

/** Port of the profile "Change Password" form (same rules and messages). */
export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, IDLE);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.status === "ok") form.current?.reset();
  }, [state]);

  const field = (name: string, label: string, autoComplete: string, hint?: string) => {
    const error = fieldError(state, name);
    return (
      <div className="space-y-1.5">
        <Label htmlFor={name}>{label}</Label>
        <Input
          id={name}
          name={name}
          type="password"
          required
          minLength={name === "oldPassword" ? 1 : 8}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={hint ? `${name}-hint` : undefined}
          className="h-11 rounded-xl"
        />
        {hint ? (
          <p id={`${name}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <form ref={form} action={action} className="space-y-4">
      {field("oldPassword", "Old password", "current-password")}
      {field(
        "newPassword",
        "New password",
        "new-password",
        "At least 8 characters, letters and numbers only, with at least one of each.",
      )}
      {field("confirmPassword", "Confirm new password", "new-password")}
      <FormMessage state={state} />
      <SubmitButton className="h-11 rounded-full px-6">Change password</SubmitButton>
    </form>
  );
}
