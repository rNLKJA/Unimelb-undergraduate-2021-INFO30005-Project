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

export type Customer = typeof customers.$inferSelect;
export type Van = typeof vans.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Blog = typeof blogs.$inferSelect;
export type Admin = typeof admins.$inferSelect;
