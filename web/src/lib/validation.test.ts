import { describe, expect, it } from "vitest";
import { extractRegexLiteral, readCoursework } from "@/test/legacy";
import {
  CHANGE_PASSWORD_REGEX,
  MESSAGES,
  SIGNUP_PASSWORD_REGEX,
  validateNewPassword,
  validateSignupPasswords,
} from "./validation";

const controller = readCoursework("controllers/customerController.js");
const originalSignup = extractRegexLiteral(controller, "/^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\'");
const originalChange = extractRegexLiteral(
  controller,
  "/^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{8,}$/",
);

const SAMPLES = [
  "test-1234", // the example the team gave markers
  "snack-2021",
  "password",
  "12345678",
  "abc123",
  "abcd1234",
  "abcd 1234",
  "abcd1234!",
  "Zz9'\";-^%$#@!+=_<>,/.:~`",
  "ümlaut123",
  "abcd1234?",
  "abcd1234*",
];

describe("password rules are the original regexes", () => {
  it.each(SAMPLES)("sign-up rule agrees on %s", (pw) => {
    expect(SIGNUP_PASSWORD_REGEX.test(pw)).toBe(originalSignup.test(pw));
  });
  it.each(SAMPLES)("change-password rule agrees on %s", (pw) => {
    expect(CHANGE_PASSWORD_REGEX.test(pw)).toBe(originalChange.test(pw));
  });
  it("keeps the original asymmetry: punctuation allowed at sign-up but not on change", () => {
    expect(SIGNUP_PASSWORD_REGEX.test("test-1234")).toBe(true);
    expect(CHANGE_PASSWORD_REGEX.test("test-1234")).toBe(false);
  });
});

describe("validation order matches the controllers", () => {
  it("sign-up checks the confirmation before the pattern", () => {
    expect(validateSignupPasswords("abc", "abd")).toBe(MESSAGES.passwordsDiffer);
    expect(validateSignupPasswords("abc", "abc")).toBe(MESSAGES.passwordRule);
    expect(validateSignupPasswords("test-1234", "test-1234")).toBeNull();
  });
  it("change-password checks the confirmation before the pattern", () => {
    expect(validateNewPassword("abcd1234", "abcd12345")).toBe(MESSAGES.newPasswordMismatch);
    expect(validateNewPassword("abcd-1234", "abcd-1234")).toBe(MESSAGES.passwordRule);
    expect(validateNewPassword("abcd1234", "abcd1234")).toBeNull();
  });
});
