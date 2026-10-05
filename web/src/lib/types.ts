/**
 * Serialisable shapes passed from the server (repositories, Route Handlers,
 * Server Actions) to client components. Timestamps are epoch milliseconds.
 */
import type { OrderStatus } from "./order-rules";

export type SnackKind = "coffee" | "biscuit" | "cake";

export type ProductDTO = {
  product: string;
  slug: string;
  price: number;
  photo: string;
  description: string;
  kind: SnackKind;
};

export type VanDTO = {
  id: number;
  vanId: string;
  slug: string;
  lat: number;
  lng: number;
  address: string;
  /** "1" = open, "0" = closed (the original encoding). */
  status: "0" | "1";
  open: boolean;
  locationUpdatedAt: number | null;
  rating: { average: number; count: number } | null;
};

export type OrderLineDTO = { food: string; quantity: number; unitPrice: number };

export type OrderDTO = {
  orderId: string;
  vanId: string;
  vanSlug: string;
  vanAddress: string;
  vanLat: number;
  vanLng: number;
  customerId: string;
  customerName: string;
  items: OrderLineDTO[];
  price: number;
  status: OrderStatus;
  orderDate: string;
  startTime: number;
  discountTime: number;
  fulfilledTime: number | null;
  collectionTime: number | null;
  rating: number | null;
  comment: string | null;
  discountApplied: boolean;
};

export type BlogDTO = {
  id: number;
  authorName: string;
  avatar: string;
  content: string;
  date: string;
  createdAt: number;
  mine: boolean;
};

export type RatingDTO = {
  orderId: string;
  vanId: string;
  rating: number;
  comment: string | null;
  customerName: string;
  avatar: string;
  at: number;
  items: string[];
};

export type ActionState =
  | { status: "idle" }
  | { status: "ok"; message?: string }
  | { status: "error"; message: string; fields?: Record<string, string> };

export const IDLE: ActionState = { status: "idle" };
