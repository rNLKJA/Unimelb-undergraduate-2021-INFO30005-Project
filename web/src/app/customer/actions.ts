"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { DEMO_CREDENTIALS } from "@/db/seed-data";
import type { ActionState } from "@/lib/types";
import {
  blogSchema,
  BLOG_WORD_LIMIT,
  loginSchema,
  placeOrderSchema,
  ratingSchema,
  signupSchema,
  updateOrderSchema,
  wordCount,
} from "@/lib/validation";
import { currentCustomer, safeNext } from "@/server/auth";
import { createPost } from "@/server/community";
import {
  authenticateCustomer,
  changePassword,
  createCustomer,
  setAvatar,
} from "@/server/customers";
import { cancelCustomerOrder, placeOrder, rateOrder, updateCustomerOrder } from "@/server/orders";
import { endSession, startSession } from "@/server/session";

const fieldErrors = (error: z.ZodError) =>
  Object.fromEntries(error.issues.map((i) => [String(i.path[0] ?? "form"), i.message]));

// --- Auth ---------------------------------------------------------------------

export async function customerLoginAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    customerId: form.get("customerId"),
    password: form.get("password"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please enter your Snacker ID and password.",
      fields: fieldErrors(parsed.error),
    };
  }
  const result = await authenticateCustomer(parsed.data.customerId, parsed.data.password);
  if (!result.ok) return { status: "error", message: result.message };
  await startSession("customer", result.customer.customerId);
  redirect(safeNext(String(form.get("next") ?? ""), "/customer"));
}

export async function customerSignupAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    firstName: form.get("firstName"),
    lastName: form.get("lastName"),
    customerId: form.get("customerId"),
    password1: form.get("password1"),
    password2: form.get("password2"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please check the highlighted fields.",
      fields: fieldErrors(parsed.error),
    };
  }
  const created = await createCustomer(parsed.data);
  if (!created.ok)
    return {
      status: "error",
      message: created.message,
      fields: { [created.field]: created.message },
    };
  // The original redirected to the login page; the revival signs the new snacker in.
  await startSession("customer", parsed.data.customerId);
  redirect(safeNext(String(form.get("next") ?? ""), "/customer"));
}

export async function customerLogoutAction(): Promise<void> {
  await endSession("customer");
  redirect("/customer");
}

// --- Orders -------------------------------------------------------------------

export type PlaceOrderResult = ActionState & { orderId?: string };

export async function placeOrderAction(input: {
  vanId: string;
  items: { food: string; quantity: number }[];
}): Promise<PlaceOrderResult> {
  const customer = await currentCustomer();
  if (!customer) return { status: "error", message: "Please log in to place your order." };
  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success)
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid order" };
  const result = await placeOrder({
    customerId: customer.customerId,
    vanId: parsed.data.vanId,
    lines: parsed.data.items,
  });
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePath("/customer/orders");
  return { status: "ok", message: result.message, orderId: result.data.orderId };
}

export async function updateOrderAction(input: {
  orderId: string;
  items: { food: string; quantity: number }[];
}): Promise<ActionState> {
  const customer = await currentCustomer();
  if (!customer) return { status: "error", message: "Please log in again." };
  const parsed = updateOrderSchema.safeParse({
    ...input,
    items: input.items.filter((i) => i.quantity > 0),
  });
  if (!parsed.success) return { status: "error", message: "do you want to cancel your order?" };
  const result = await updateCustomerOrder({
    customerId: customer.customerId,
    orderId: parsed.data.orderId,
    lines: parsed.data.items,
  });
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePath(`/customer/orders/${parsed.data.orderId}`);
  return { status: "ok", message: result.message };
}

export async function cancelOrderAction(orderId: string): Promise<ActionState> {
  const customer = await currentCustomer();
  if (!customer) return { status: "error", message: "Please log in again." };
  const result = await cancelCustomerOrder({
    customerId: customer.customerId,
    orderId: String(orderId),
  });
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePath("/customer/orders");
  return { status: "ok", message: result.message };
}

export async function rateOrderAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const customer = await currentCustomer();
  if (!customer) return { status: "error", message: "Please log in again." };
  const parsed = ratingSchema.safeParse({
    orderId: form.get("orderId"),
    rating: form.get("rating"),
    comment: form.get("comment") ?? "",
  });
  if (!parsed.success)
    return { status: "error", message: "Please pick a rating from 1 to 5 stars." };
  const result = await rateOrder({ customerId: customer.customerId, ...parsed.data });
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePath(`/customer/orders/${parsed.data.orderId}`);
  revalidatePath("/customer/community");
  return { status: "ok", message: "Thanks for your Rating" };
}

// --- Community ----------------------------------------------------------------

export async function createPostAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const customer = await currentCustomer();
  if (!customer) return { status: "error", message: "Please log in to share your story." };
  const parsed = blogSchema.safeParse({ content: form.get("content") });
  if (!parsed.success)
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid post" };
  if (wordCount(parsed.data.content) > BLOG_WORD_LIMIT) {
    return { status: "error", message: `Please enter less than ${BLOG_WORD_LIMIT} words.` };
  }
  await createPost(customer.customerId, parsed.data.content);
  revalidatePath("/customer/community");
  return { status: "ok", message: "Posted to the community board" };
}

// --- Profile ------------------------------------------------------------------

export async function changePasswordAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const customer = await currentCustomer();
  if (!customer) return { status: "error", message: "Please log in again." };
  if (customer.customerId === DEMO_CREDENTIALS.customer.customerId) {
    return {
      status: "error",
      message:
        "The shared demo account's password can't be changed. Sign up for your own account to try this.",
    };
  }
  const result = await changePassword(customer.customerId, {
    oldPassword: String(form.get("oldPassword") ?? ""),
    newPassword: String(form.get("newPassword") ?? ""),
    confirmPassword: String(form.get("confirmPassword") ?? ""),
  });
  if (!result.ok)
    return { status: "error", message: result.message, fields: { [result.field]: result.message } };
  return { status: "ok", message: result.message };
}

export async function setAvatarAction(avatar: string): Promise<ActionState> {
  const customer = await currentCustomer();
  if (!customer) return { status: "error", message: "Please log in again." };
  const ok = await setAvatar(customer.customerId, String(avatar));
  if (!ok) return { status: "error", message: "Unknown avatar" };
  revalidatePath("/customer", "layout");
  return { status: "ok", message: "Profile picture updated" };
}
