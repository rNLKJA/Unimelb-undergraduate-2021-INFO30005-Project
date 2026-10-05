export const REPO_URL = "https://github.com/rNLKJA/Unimelb-undergraduate-2021-INFO30005-Project";
/**
 * The original submission, pinned to the commit that moved it into
 * coursework/ (contents unchanged since). A commit link keeps working before
 * and after the revival branch is merged into main.
 */
export const COURSEWORK_COMMIT = "257c590bbf1fbcb3972a7aaf7bc87140780e8312";
export const COURSEWORK_URL = `${REPO_URL}/tree/${COURSEWORK_COMMIT}/coursework`;

export const TEAM = [
  {
    name: "Sunchuangyu (Rin) Huang",
    role: "Vendor app design, customer ordering, outstanding-orders list, customer & vendor login, the map (nearest van) and blog bonus features, vendor CSS. Led the 2026 revival.",
    highlight: true,
  },
  {
    name: "Bin Liang",
    role: "Database schema design, snack details, marking orders fulfilled, order details, completed orders, the rating bonus feature.",
  },
  {
    name: "Declan Gannon",
    role: "Customer app foundations, menu styling, customer profile, vendor order search, the project report and test suites.",
  },
  {
    name: "Khin Liew",
    role: "Customer app foundations and mock-up annotations, starting an order, vendor outstanding orders, history and order details.",
  },
  {
    name: "Wei (Eric) Zhao",
    role: "Customer design polish, van status, multi-snack orders, cart features and CSS, password hashing, Passport strategies and route guards.",
  },
] as const;
