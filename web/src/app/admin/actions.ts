"use server";

import { redirect } from "next/navigation";
import { toCsv } from "@/lib/csv";
import type { ActionState } from "@/lib/types";
import { adminLoginSchema } from "@/lib/validation";
import { currentAdmin } from "@/server/auth";
import { allRecords, authenticateAdmin, isRecordTable } from "@/server/records";
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

export type CsvExport =
  { status: "ok"; filename: string; csv: string } | { status: "error"; message: string };

/**
 * CSV export of one table (admin only; password hashes stay redacted). A
 * Server Action rather than a Route Handler so it reads the same database
 * copy as the records page in the /tmp demo-storage mode (see live-actions.ts).
 */
export async function exportTableCsvAction(table: string, q?: string): Promise<CsvExport> {
  if (!(await currentAdmin())) return { status: "error", message: "Please log in to get access" };
  const name = String(table);
  if (!isRecordTable(name)) return { status: "error", message: "Unknown table" };
  const query = typeof q === "string" && q.trim() ? q.slice(0, 80) : undefined;
  const { columns, rows } = await allRecords(name, query);
  const stamp = new Date().toISOString().slice(0, 10);
  return {
    status: "ok",
    filename: `snacks-in-a-van-${name}-${stamp}.csv`,
    csv: toCsv(columns, rows),
  };
}
