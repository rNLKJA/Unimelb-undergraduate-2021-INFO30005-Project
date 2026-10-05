/**
 * Port of `utility.generateOrderID()`: three random capital letters followed by
 * a random integer in [0, 9 999 999) — not zero padded, so IDs vary in length
 * (e.g. "ARD4391846", "QXZ52"). The original prefixed a space and trimmed it.
 */
const CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export type RandomSource = () => number;

export function generateOrderId(random: RandomSource = Math.random): string {
  let letters = "";
  for (let i = 0; i < 3; i++) {
    letters += CHARACTERS.charAt(Math.floor(random() * CHARACTERS.length));
  }
  // `random(0, 9999999)` from the original: Math.floor(Math.random() * (max - min)) + min
  const num = Math.floor(random() * (9_999_999 - 0)) + 0;
  return `${letters}${num}`;
}

export const ORDER_ID_PATTERN = /^[A-Z]{3}\d{1,7}$/;
