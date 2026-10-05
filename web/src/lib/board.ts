import type { DayStats } from "./stats/day-stats";
import type { OrderDTO, VanDTO } from "./types";

/** What the vendor board Route Handler returns (and the page pre-renders). */
export type VendorBoard = {
  outstanding: OrderDTO[];
  fulfilled: OrderDTO[];
  collected: OrderDTO[];
  stats: DayStats;
  serverNow: number;
};

export type VendorBoardData = VendorBoard & { van: VanDTO };
