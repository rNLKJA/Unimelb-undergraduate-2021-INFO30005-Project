/** URL-safe slug ("Ardeth Lavon" -> "ardeth-lavon", "Flat White" -> "flat-white"). */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Vans are addressed by a slug of their name in the revived URLs. */
export const vanSlug = slugify;

/** "Olivia Nguyen" -> "Olivia N." — public pages never show full names or IDs. */
export function publicName(firstName: string, lastName: string): string {
  const initial = lastName.trim().charAt(0);
  return initial ? `${firstName.trim()} ${initial.toUpperCase()}.` : firstName.trim();
}
