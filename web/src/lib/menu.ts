/**
 * The snack menu, recovered from the rendered page saved in
 * `coursework/Mockup 2/Customer Task 1 output.html` (names, order and prices are
 * exactly as served by the 2021 app). The original photos were Unsplash
 * hot-links and the descriptions lived only in the lost MongoDB collection, so
 * both are new: illustrated SVGs committed in /public/images/snacks and short
 * descriptions written for the revival.
 */
export type MenuItem = {
  product: string;
  price: number;
  photo: string;
  description: string;
  kind: "coffee" | "biscuit" | "cake";
};

export const MENU: readonly MenuItem[] = [
  {
    product: "Cappuccino",
    price: 4.99,
    photo: "/images/snacks/cappuccino.svg",
    description: "A double shot under a deep cap of silky foam, dusted with cocoa.",
    kind: "coffee",
  },
  {
    product: "Latte",
    price: 4.99,
    photo: "/images/snacks/latte.svg",
    description: "Espresso and plenty of steamed milk in a tall glass, mellow and creamy.",
    kind: "coffee",
  },
  {
    product: "Flat White",
    price: 4.99,
    photo: "/images/snacks/flat-white.svg",
    description: "Melbourne's own: a strong ristretto base with a thin, velvety microfoam.",
    kind: "coffee",
  },
  {
    product: "Long Black",
    price: 4.99,
    photo: "/images/snacks/long-black.svg",
    description: "Two shots pulled over hot water, keeping the crema on top. No milk.",
    kind: "coffee",
  },
  {
    product: "Plain Biscuit",
    price: 10.99,
    photo: "/images/snacks/plain-biscuit.svg",
    description: "A bag of buttery shortbread rounds baked fresh each morning.",
    kind: "biscuit",
  },
  {
    product: "Fancy Biscuit",
    price: 12.99,
    photo: "/images/snacks/fancy-biscuit.svg",
    description: "Iced and sprinkled sandwich biscuits with a raspberry jam centre.",
    kind: "biscuit",
  },
  {
    product: "Small Cake",
    price: 12.99,
    photo: "/images/snacks/small-cake.svg",
    description: "A single-serve vanilla sponge with whipped cream and a strawberry.",
    kind: "cake",
  },
  {
    product: "Large Cake",
    price: 18.99,
    photo: "/images/snacks/large-cake.svg",
    description: "A three-layer chocolate cake to share, finished with a cherry on top.",
    kind: "cake",
  },
];

export function menuItem(product: string): MenuItem | undefined {
  return MENU.find((m) => m.product === product);
}

/** URL-safe slug for a product name ("Flat White" -> "flat-white"). */
export function productSlug(product: string): string {
  return product
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
