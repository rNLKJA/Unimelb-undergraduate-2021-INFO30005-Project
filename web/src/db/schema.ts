/**
 * SQLite (libSQL) schema ported from the original Mongoose models in
 * `coursework/models/*.js`. Entity names, field names (snake_case columns) and
 * enum values follow the originals; the differences are deliberate:
 *
 *  - Mongo `_id`s become integer primary keys; the natural keys the original
 *    app actually joined on (`customer_id`, `van_id`, `order_id`, `product`)
 *    stay unique text columns and are used for foreign keys.
 *  - `order_items` was an embedded array of `{ food, quantity }`; it is now a
 *    child table.
 *  - Times were "H:M:S" strings; they are now epoch-millisecond timestamps.
 *    `order_date` keeps the original "D-M-YYYY" string (Melbourne time).
 *  - Passwords are bcrypt hashes (vans used unsalted MD5 originally).
 *  - `admins` is new: it backs the /admin/records area of the revived app.
 */
import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const ORDER_STATUS_VALUES = ["outstanding", "fulfilled", "collected", "canceled"] as const;
export const VAN_STATUS_VALUES = ["0", "1"] as const;

const now = sql`(cast(unixepoch('subsec') * 1000 as integer))`;

/** models/customerSchema.js */
export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Login ID — the sign-up form asked for an email address. */
  customerId: text("customer_id").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  password: text("password").notNull(),
  /** Originally an Unsplash photo id; now the key of a bundled avatar. */
  portfolioImg: text("portfolio_img"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
});

/** models/vanSchema.js */
export const vans = sqliteTable(
  "vans",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** The van's name, e.g. "Irma Opal" — also its login. */
    vanId: text("van_id").notNull().unique(),
    password: text("password").notNull(),
    /** Latitude (the original called it x_coord). */
    xCoord: real("x_coord").notNull(),
    /** Longitude (the original called it y_coord). */
    yCoord: real("y_coord").notNull(),
    address: text("address").notNull().default(""),
    /** "1" = open / ready for orders, "0" = closed. */
    status: text("status", { enum: VAN_STATUS_VALUES }).notNull().default("0"),
    locationUpdatedAt: integer("location_updated_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("vans_status_idx").on(t.status)],
);

/** models/menuSchema.js (Mongoose model name "Product") */
export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  product: text("product").notNull().unique(),
  price: real("price").notNull(),
  photo: text("photo"),
  description: text("description"),
});

/** models/orderSchema.js */
export const orders = sqliteTable(
  "orders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: text("order_id").notNull().unique(),
    vanId: text("van_id")
      .notNull()
      .references(() => vans.vanId, { onUpdate: "cascade" }),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.customerId, { onUpdate: "cascade" }),
    price: real("price").notNull(),
    status: text("status", { enum: ORDER_STATUS_VALUES }).notNull(),
    /** "D-M-YYYY" in Melbourne time, as the original stored it. */
    orderDate: text("order_date").notNull(),
    startTime: integer("start_time", { mode: "timestamp_ms" }).notNull(),
    collectionTime: integer("collection_time", { mode: "timestamp_ms" }),
    /** start_time + 15 minutes: after this the late-order discount applies. */
    discountTime: integer("discount_time", { mode: "timestamp_ms" }).notNull(),
    fulfilledTime: integer("fulfilled_time", { mode: "timestamp_ms" }),
    endTime: integer("end_time", { mode: "timestamp_ms" }),
    period: text("period"),
    comment: text("comment"),
    rating: integer("rating"),
    discountApplied: integer("discount_applied", { mode: "boolean" }).notNull().default(false),
    /**
     * New in the 2026 upgrade: when demo housekeeping closed this order out
     * (see `closeStaleDemoOrders`). Null for every order a person finished.
     */
    closedOutAt: integer("closed_out_at", { mode: "timestamp_ms" }),
    /**
     * True when `fulfilled_time` was invented by that housekeeping (the order
     * was never marked ready). Analytics exclude these times and treat the
     * order as censored at `closed_out_at` instead.
     */
    fulfilmentImputed: integer("fulfilment_imputed", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [
    index("orders_van_status_idx").on(t.vanId, t.status),
    index("orders_customer_idx").on(t.customerId),
    index("orders_start_idx").on(t.startTime),
  ],
);

/** The embedded `orderItems` sub-schema, now a child table. */
export const orderItems = sqliteTable(
  "order_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.orderId, { onDelete: "cascade", onUpdate: "cascade" }),
    food: text("food")
      .notNull()
      .references(() => products.product, { onUpdate: "cascade" }),
    quantity: integer("quantity").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

/** models/blogSchema.js */
export const blogs = sqliteTable(
  "blogs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.customerId, { onUpdate: "cascade" }),
    content: text("content").notNull(),
    /** "D-M-YYYY", as written by utility.currentDate(). */
    date: text("date").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
  },
  (t) => [index("blogs_created_idx").on(t.createdAt)],
);

/** New in the revival: accounts for the read-only records area. */
export const admins = sqliteTable("admins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
});

/**
 * New in the revival: tiny key/value store. `seeded_at` records when the seed
 * ran so a copied snapshot can shift its demo history to "recent".
 */
export const appMeta = sqliteTable("app_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const AUDIT_ACTOR_ROLES = ["vendor", "admin", "customer", "system"] as const;
export const AI_DECISIONS = [
  "pending",
  "accepted",
  "edited",
  "rejected",
  "not-applicable",
] as const;

/**
 * New in the 2026 upgrade: an append-only audit trail of actions that change
 * state or expose records (order status changes, van open/close and
 * location, admin exports, AI review decisions). Triggers in migration 0002
 * reject UPDATE and DELETE; the only way rows leave is a full demo reset
 * (see `clearDatabase`), which wipes every table.
 */
export const auditLog = sqliteTable(
  "audit_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    at: integer("at", { mode: "timestamp_ms" }).notNull().default(now),
    actorRole: text("actor_role", { enum: AUDIT_ACTOR_ROLES }).notNull(),
    /** Van name, admin username or customer login; "demo-housekeeping" for automated demo upkeep. */
    actorId: text("actor_id").notNull(),
    /** Dotted verb, e.g. "order.fulfilled", "van.opened", "records.exported". */
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    /** Small JSON object: from/to status, discount flag, export filter... */
    detail: text("detail"),
  },
  (t) => [
    index("audit_log_at_idx").on(t.at),
    index("audit_log_entity_idx").on(t.entityType, t.entityId),
  ],
);

/**
 * New in the 2026 upgrade: one row per bring-your-own-key AI call (posted by
 * a server action after the browser called the provider). Never holds an API
 * key. The call record is immutable; only the human decision may move, once,
 * from "pending" to accepted / edited / rejected (enforced by triggers). A
 * failed call has nothing to review and is stored as "not-applicable".
 */
export const aiAuditLog = sqliteTable(
  "ai_audit_log",
  {
    id: text("id").primaryKey(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(now),
    feature: text("feature").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    /** The van whose session posted the entry. */
    actorId: text("actor_id").notNull(),
    /** JSON: the system prompt, the user prompt and the aggregate metrics sent. */
    input: text("input").notNull(),
    /** JSON of the validated output, or null when the call failed. */
    output: text("output"),
    /** The model's raw text (kept when validation failed, the reply was cut off or refused). */
    outputText: text("output_text"),
    errorKind: text("error_kind"),
    errorMessage: text("error_message"),
    latencyMs: integer("latency_ms").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    /** JSON: the automatic fact check of the numbers in the output, recomputed by the server. */
    factCheck: text("fact_check"),
    /**
     * Whether the figures in the prompt equal the server's own figures for
     * that van when the record arrived (null for rows logged before 0003).
     * The prompt itself is always checked to be the app's fixed instructions
     * plus a well-formed set of aggregate figures; this flag says whether
     * those figures were still current.
     */
    inputMatchesServer: integer("input_matches_server", { mode: "boolean" }),
    humanDecision: text("human_decision", { enum: AI_DECISIONS }).notNull().default("pending"),
    editedOutput: text("edited_output"),
    decidedAt: integer("decided_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("ai_audit_log_created_idx").on(t.createdAt)],
);

export type Customer = typeof customers.$inferSelect;
export type Van = typeof vans.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Blog = typeof blogs.$inferSelect;
export type Admin = typeof admins.$inferSelect;
export type AuditLogRow = typeof auditLog.$inferSelect;
export type AiAuditLogRow = typeof aiAuditLog.$inferSelect;
