import { z } from "zod";
import { ORDER_STATUSES, RATING_VALUES } from "./order-rules";

/**
 * Sign-up password rule from `customerController.updateNewAccountToDB`
 * (copied verbatim): at least 8 characters, at least one letter and one digit,
 * and only letters, digits or the listed punctuation.
 */
export const SIGNUP_PASSWORD_REGEX =
  /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\'\"\;\-\^\%\$\#\@\!\+\=\_\<\>\,\/\.\:\~\`\d]{8,}$/;

/**
 * Change-password rule from `customerController.changePassword` (verbatim).
 * Note that, unlike sign-up, it allows letters and digits only.
 */
export const CHANGE_PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;

/** Messages from the original `login_error*.hbs` partials and profile view. */
export const MESSAGES = {
  wrongPassword: "Oops! Wrong password.",
  customerNotFound: "Customer not found.",
  vanNotFound: "Van not found.",
  vendorLoginFailed: "Please Enter the CORRECT Van ID or Password",
  passwordsDiffer: "Two passwords are inconsistent, Please Try Again",
  customerExists: "Snacker already exist",
  passwordRule: "Password must contain at least one alphabetic character and one numeric character",
  oldPasswordIncorrect: "Old password incorrect",
  newPasswordMismatch: "New password confirmation does not match",
  passwordChanged: "Password successfully changed",
} as const;

export type SignupInput = {
  firstName: string;
  lastName: string;
  customerId: string;
  password1: string;
  password2: string;
};

/** Ordered exactly like the controller: mismatch first, then the regex. */
export function validateSignupPasswords(password1: string, password2: string): string | null {
  if (password1 !== password2) return MESSAGES.passwordsDiffer;
  if (!SIGNUP_PASSWORD_REGEX.test(password1)) return MESSAGES.passwordRule;
  return null;
}

/** Ordered like `changePassword`: confirmation, regex, then the old password. */
export function validateNewPassword(newPassword: string, confirmPassword: string): string | null {
  if (newPassword !== confirmPassword) return MESSAGES.newPasswordMismatch;
  if (!CHANGE_PASSWORD_REGEX.test(newPassword)) return MESSAGES.passwordRule;
  return null;
}

const trimmed = (max: number) => z.string().trim().min(1).max(max);

export const signupSchema = z.object({
  firstName: trimmed(60),
  lastName: trimmed(60),
  customerId: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please use an email address as your Snacker ID")
    .max(120),
  password1: z.string().min(8).max(128),
  password2: z.string().min(1).max(128),
});

export const loginSchema = z.object({
  customerId: z.string().trim().toLowerCase().min(1, "Please Enter the LOGIN ID").max(120),
  password: z.string().min(1).max(128),
});

export const vendorLoginSchema = z.object({
  vanId: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(128),
});

export const adminLoginSchema = z.object({
  username: z.string().trim().min(1).max(60),
  password: z.string().min(1).max(128),
});

export const cartLineSchema = z.object({
  food: z.string().trim().min(1).max(60),
  quantity: z.coerce.number().int().min(1).max(50),
});

export const placeOrderSchema = z.object({
  vanId: z.string().trim().min(1).max(80),
  items: z.array(cartLineSchema).min(1, "please order something").max(20),
});

export const updateOrderSchema = z.object({
  orderId: z.string().trim().min(1).max(20),
  items: z.array(cartLineSchema).min(1).max(20),
});

export const ratingSchema = z.object({
  orderId: z.string().trim().min(1).max(20),
  rating: z.coerce
    .number()
    .int()
    .refine((n) => (RATING_VALUES as readonly number[]).includes(n), "Rating must be 1 to 5"),
  comment: z.string().trim().max(500).optional().default(""),
});

export const blogSchema = z.object({
  content: z.string().trim().min(1, "Please write something first").max(2000),
});

export const vanLocationSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  address: z.string().trim().max(200).optional().default(""),
  geocodedAddress: z.string().trim().max(200).optional().default(""),
});

export const orderStatusSchema = z.enum(ORDER_STATUSES);

/** Blog guidance from the original placeholder: "less than 300 words". */
export const BLOG_WORD_LIMIT = 300;

export function wordCount(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}
