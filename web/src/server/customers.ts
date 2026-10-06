import "server-only";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { customers, type Customer } from "@/db/schema";
import { AVATAR_CHOICES } from "@/db/seed-data";
import { MESSAGES, validateNewPassword, validateSignupPasswords } from "@/lib/validation";

const BCRYPT_ROUNDS = 10;

export type PublicCustomer = Omit<Customer, "password" | "createdAt"> & { createdAt: number };

function toPublic(c: Customer): PublicCustomer {
  return {
    id: c.id,
    customerId: c.customerId,
    firstName: c.firstName,
    lastName: c.lastName,
    portfolioImg: c.portfolioImg,
    createdAt: c.createdAt.getTime(),
  };
}

export async function getCustomer(customerId: string): Promise<PublicCustomer | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(customers)
    .where(eq(customers.customerId, customerId))
    .limit(1);
  return row ? toPublic(row) : null;
}

/** Port of the "local-login" passport strategy (same messages). */
export async function authenticateCustomer(
  customerId: string,
  password: string,
): Promise<{ ok: true; customer: PublicCustomer } | { ok: false; message: string }> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(customers)
    .where(eq(customers.customerId, customerId))
    .limit(1);
  if (!row) return { ok: false, message: MESSAGES.customerNotFound };
  const valid = await bcrypt.compare(password, row.password);
  if (!valid) return { ok: false, message: MESSAGES.wrongPassword };
  return { ok: true, customer: toPublic(row) };
}

/** Port of `updateNewAccountToDB` — checks in the same order, same messages. */
export async function createCustomer(input: {
  firstName: string;
  lastName: string;
  customerId: string;
  password1: string;
  password2: string;
}): Promise<{ ok: true } | { ok: false; message: string; field: string }> {
  const passwordError = validateSignupPasswords(input.password1, input.password2);
  if (passwordError) return { ok: false, message: passwordError, field: "password1" };

  const db = await getDb();
  const [existing] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.customerId, input.customerId))
    .limit(1);
  if (existing) return { ok: false, message: MESSAGES.customerExists, field: "customerId" };

  await db.insert(customers).values({
    customerId: input.customerId,
    firstName: input.firstName,
    lastName: input.lastName,
    password: await bcrypt.hash(input.password1, BCRYPT_ROUNDS),
    portfolioImg: "flat-white",
  });
  return { ok: true };
}

/** Port of `changePassword`: confirmation, then the regex, then the old password. */
export async function changePassword(
  customerId: string,
  input: { oldPassword: string; newPassword: string; confirmPassword: string },
): Promise<{ ok: true; message: string } | { ok: false; message: string; field: string }> {
  const ruleError = validateNewPassword(input.newPassword, input.confirmPassword);
  if (ruleError) {
    return {
      ok: false,
      message: ruleError,
      field: ruleError === MESSAGES.newPasswordMismatch ? "confirmPassword" : "newPassword",
    };
  }
  const db = await getDb();
  const [row] = await db
    .select()
    .from(customers)
    .where(eq(customers.customerId, customerId))
    .limit(1);
  if (!row || !(await bcrypt.compare(input.oldPassword, row.password))) {
    return { ok: false, message: MESSAGES.oldPasswordIncorrect, field: "oldPassword" };
  }
  await db
    .update(customers)
    .set({ password: await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS) })
    .where(eq(customers.customerId, customerId));
  return { ok: true, message: MESSAGES.passwordChanged };
}

/** Replaces `upload_profile` (which stored an Unsplash photo id). */
export async function setAvatar(customerId: string, avatar: string): Promise<boolean> {
  if (!(AVATAR_CHOICES as readonly string[]).includes(avatar)) return false;
  const db = await getDb();
  await db
    .update(customers)
    .set({ portfolioImg: avatar })
    .where(eq(customers.customerId, customerId));
  return true;
}
