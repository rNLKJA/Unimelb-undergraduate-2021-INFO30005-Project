"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/types";
import { adminLoginSchema } from "@/lib/validation";
import { authenticateAdmin } from "@/server/records";
import { endSession, startSession } from "@/server/session";

export async function adminLoginAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = adminLoginSchema.safeParse({
    username: form.get("username"),
    password: form.get("password"),
  });
  if (!parsed.success) return { status: "error", message: "Please enter a username and password." };
  if (!(await authenticateAdmin(parsed.data.username, parsed.data.password))) {
    return { status: "error", message: "Wrong username or password." };
  }
  await startSession("admin", parsed.data.username);
  redirect("/admin/records");
}

export async function adminLogoutAction(): Promise<void> {
  await endSession("admin");
  redirect("/admin/login");
}
