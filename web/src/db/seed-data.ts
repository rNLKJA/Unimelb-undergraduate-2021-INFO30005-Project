/**
 * Synthetic seed data for the demo database.
 *
 * - Van names come from the team's original `vendor login info.csv` (names
 *   only — the CSV's plaintext passwords were never reused; every account here
 *   gets a fresh demo password, stored as a bcrypt hash).
 * - Van locations are public landmarks around the CBD, Carlton and Parkville.
 * - Customers use reserved example domains; nothing here is real personal data.
 *
 * DEMO CREDENTIALS (also shown on the login pages — these are throwaway values
 * for a public demo, not secrets):
 */
export const DEMO_CREDENTIALS = {
  customer: { customerId: "snacker@demo.test", password: "snack-2021" },
  vendor: { vanId: "Ardeth Lavon", password: "vanpass2021" },
  admin: { username: "admin", password: "admin-2021" },
} as const;

export type VanSeed = {
  vanId: string;
  lat: number;
  lng: number;
  address: string;
  status: "0" | "1";
};

export const VAN_SEEDS: readonly VanSeed[] = [
  {
    vanId: "Ardeth Lavon",
    lat: -37.7983,
    lng: 144.961,
    address: "University of Melbourne, Grattan Street, Parkville VIC 3010",
    status: "1",
  },
  {
    vanId: "Gwendolyn Cecilia",
    lat: -37.8098,
    lng: 144.9652,
    address: "State Library Victoria, 328 Swanston Street, Melbourne VIC 3000",
    status: "1",
  },
  {
    vanId: "Genevieve Adele",
    lat: -37.8076,
    lng: 144.9568,
    address: "Queen Victoria Market, Queen Street, Melbourne VIC 3000",
    status: "1",
  },
  {
    vanId: "Penelope Karen",
    lat: -37.799,
    lng: 144.9668,
    address: "Lygon Street, Carlton VIC 3053",
    status: "1",
  },
  {
    vanId: "Beth Dorris",
    lat: -37.8047,
    lng: 144.9717,
    address: "Carlton Gardens, Nicholson Street, Carlton VIC 3053",
    status: "1",
  },
  {
    vanId: "Winona Alta",
    lat: -37.818,
    lng: 144.9691,
    address: "Federation Square, Swanston Street, Melbourne VIC 3000",
    status: "1",
  },
  {
    vanId: "Corrine Kay",
    lat: -37.8203,
    lng: 144.9645,
    address: "Southbank Promenade, Southbank VIC 3006",
    status: "1",
  },
  {
    vanId: "Audrey Laverne",
    lat: -37.799,
    lng: 144.956,
    address: "Royal Melbourne Hospital, Grattan Street, Parkville VIC 3050",
    status: "1",
  },
  {
    vanId: "Lois Patti",
    lat: -37.784,
    lng: 144.9515,
    address: "Melbourne Zoo, Elliott Avenue, Parkville VIC 3052",
    status: "1",
  },
  {
    vanId: "Helene Bonita",
    lat: -37.8105,
    lng: 144.9545,
    address: "Flagstaff Gardens, William Street, West Melbourne VIC 3003",
    status: "0",
  },
  {
    vanId: "Irma Opal",
    lat: -37.817,
    lng: 144.9465,
    address: "Harbour Esplanade, Docklands VIC 3008",
    status: "1",
  },
  {
    vanId: "Elsie Julie",
    lat: -37.803,
    lng: 144.949,
    address: "Errol Street, North Melbourne VIC 3051",
    status: "0",
  },
  {
    vanId: "Phyllis Jeanette",
    lat: -37.7985,
    lng: 144.9785,
    address: "Brunswick Street, Fitzroy VIC 3065",
    status: "1",
  },
  {
    vanId: "Leslie Peggy",
    lat: -37.8076,
    lng: 144.9631,
    address: "RMIT University, Swanston Street, Melbourne VIC 3000",
    status: "1",
  },
  {
    vanId: "Rachel Noreen",
    lat: -37.7845,
    lng: 144.9605,
    address: "Princes Park, Princes Park Drive, Carlton North VIC 3054",
    status: "0",
  },
];

export type CustomerSeed = {
  customerId: string;
  firstName: string;
  lastName: string;
  avatar: string;
};

export const CUSTOMER_SEEDS: readonly CustomerSeed[] = [
  {
    customerId: DEMO_CREDENTIALS.customer.customerId,
    firstName: "Sam",
    lastName: "Snacker",
    avatar: "flat-white",
  },
  {
    customerId: "olivia.nguyen@example.com",
    firstName: "Olivia",
    lastName: "Nguyen",
    avatar: "latte",
  },
  {
    customerId: "jack.smith@example.com",
    firstName: "Jack",
    lastName: "Smith",
    avatar: "long-black",
  },
  { customerId: "mia.chen@example.com", firstName: "Mia", lastName: "Chen", avatar: "small-cake" },
  {
    customerId: "noah.williams@example.com",
    firstName: "Noah",
    lastName: "Williams",
    avatar: "plain-biscuit",
  },
  {
    customerId: "isla.patel@example.com",
    firstName: "Isla",
    lastName: "Patel",
    avatar: "cappuccino",
  },
  {
    customerId: "leo.kowalski@example.com",
    firstName: "Leo",
    lastName: "Kowalski",
    avatar: "fancy-biscuit",
  },
  {
    customerId: "ava.brown@example.org",
    firstName: "Ava",
    lastName: "Brown",
    avatar: "large-cake",
  },
  { customerId: "lucas.tran@example.org", firstName: "Lucas", lastName: "Tran", avatar: "latte" },
  {
    customerId: "zoe.martin@example.org",
    firstName: "Zoe",
    lastName: "Martin",
    avatar: "cappuccino",
  },
];

export const RATING_COMMENTS: readonly string[] = [
  "Coffee was ready before I got to the front of the line.",
  "Flat white was spot on, thanks!",
  "Friendly crew and a great spot on campus.",
  "The fancy biscuits are dangerously good.",
  "A little slow at lunch rush but worth the wait.",
  "Perfect pick-me-up between lectures.",
  "Large cake made the office very happy.",
  "Long black had a lovely crema.",
  "Easy to find the van on the map.",
  "Got the late discount, nice touch.",
];

export const BLOG_POSTS: readonly { author: string; content: string; daysAgo: number }[] = [
  {
    author: "olivia.nguyen@example.com",
    daysAgo: 19,
    content:
      "Found the van parked right outside the library during exam week. Honestly the best flat white I've had on campus.",
  },
  {
    author: "jack.smith@example.com",
    daysAgo: 17,
    content:
      "Pro tip: order on the walk over and it's ready by the time you arrive. The map shows the five closest vans.",
  },
  {
    author: "mia.chen@example.com",
    daysAgo: 15,
    content: "Small cake + latte is my Friday ritual now. The strawberry on top makes it.",
  },
  {
    author: "noah.williams@example.com",
    daysAgo: 13,
    content: "Is it just me or does the Docklands van have the best view in Melbourne?",
  },
  {
    author: "isla.patel@example.com",
    daysAgo: 11,
    content:
      "Changed my order two minutes after placing it (forgot a biscuit). Glad there's a ten-minute window for that.",
  },
  {
    author: "leo.kowalski@example.com",
    daysAgo: 10,
    content: "Fancy biscuits for the whole tutorial group. We are now a fancy biscuit tutorial.",
  },
  {
    author: "ava.brown@example.org",
    daysAgo: 8,
    content: "Rainy morning at Federation Square, hot cappuccino, no queue. Perfect.",
  },
  {
    author: "lucas.tran@example.org",
    daysAgo: 7,
    content:
      "My order took a bit longer at peak time and the late discount kicked in automatically. Fair play.",
  },
  {
    author: "zoe.martin@example.org",
    daysAgo: 5,
    content: "Long black drinkers unite. The crema on these is excellent.",
  },
  {
    author: "snacker@demo.test",
    daysAgo: 4,
    content:
      "First time trying the van at Melbourne Uni. Grabbed a flat white between lectures and it was ready in five minutes.",
  },
  {
    author: "olivia.nguyen@example.com",
    daysAgo: 3,
    content: "Shout out to the Lygon Street van for remembering my order.",
  },
  {
    author: "mia.chen@example.com",
    daysAgo: 2,
    content: "Large cake for a birthday picnic in Carlton Gardens. Ten out of ten.",
  },
  {
    author: "jack.smith@example.com",
    daysAgo: 1,
    content: "The zoo van is open early on weekends if you need coffee before the penguins.",
  },
  {
    author: "isla.patel@example.com",
    daysAgo: 0,
    content:
      "Rating every order now so the vans know what's working. Plain biscuits are underrated.",
  },
];

/** Avatars a customer can choose on their profile (keys of bundled snack art). */
export const AVATAR_CHOICES = [
  "cappuccino",
  "latte",
  "flat-white",
  "long-black",
  "plain-biscuit",
  "fancy-biscuit",
  "small-cake",
  "large-cake",
] as const;
