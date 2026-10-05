"use client";

import { ReceiptText } from "lucide-react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import useSWR from "swr";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNow } from "@/hooks/use-now";
import { liveActiveOrders } from "@/app/live-actions";
import { liveData } from "@/lib/fetcher";
import type { OrderDTO } from "@/lib/types";
import { OrderCard } from "./order-card";

type Props = {
  active: OrderDTO[];
  completed: OrderDTO[];
  cancelled: OrderDTO[];
  serverNow: number;
};

export function OrdersView({ active: initialActive, completed, cancelled, serverNow }: Props) {
  const { data } = useSWR<{ active: OrderDTO[]; serverNow: number }>(
    "live-active-orders",
    () => liveData(liveActiveOrders()),
    {
      refreshInterval: 4000,
      fallbackData: { active: initialActive, serverNow },
      revalidateOnMount: false,
    },
  );
  const active = data?.active ?? initialActive;
  const now = useNow(serverNow);

  const list = (orders: OrderDTO[], live: boolean, empty: { title: string; body: string }) =>
    orders.length === 0 ? (
      <EmptyState
        icon={<ReceiptText />}
        title={empty.title}
        headingLevel={2}
        action={
          live ? (
            <Button asChild className="h-11 rounded-full px-5">
              <Link href="/customer">Find a van</Link>
            </Button>
          ) : undefined
        }
      >
        {empty.body}
      </EmptyState>
    ) : (
      <ul className="space-y-3">
        <AnimatePresence initial={false}>
          {orders.map((order) => (
            <motion.li
              key={order.orderId}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
            >
              <OrderCard order={order} now={now} live={live} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    );

  return (
    <Tabs defaultValue="active" className="gap-5">
      <TabsList className="h-11 w-full min-w-0 rounded-full p-1 sm:w-auto">
        <TabsTrigger value="active" className="min-w-0 rounded-full px-2 sm:px-4">
          In progress <span className="tabular ml-0.5 font-normal">{active.length}</span>
        </TabsTrigger>
        <TabsTrigger value="completed" className="min-w-0 rounded-full px-2 sm:px-4">
          Completed <span className="tabular ml-0.5 font-normal">{completed.length}</span>
        </TabsTrigger>
        <TabsTrigger value="cancelled" className="min-w-0 rounded-full px-2 sm:px-4">
          Cancelled <span className="tabular ml-0.5 font-normal">{cancelled.length}</span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="active">
        {list(active, true, {
          title: "Nothing cooking right now",
          body: "Orders you place show up here with a live 15-minute countdown.",
        })}
      </TabsContent>
      <TabsContent value="completed">
        {list(completed, false, {
          title: "No completed orders yet",
          body: "Once a van hands over your order it moves here, ready for a rating.",
        })}
      </TabsContent>
      <TabsContent value="cancelled">
        {list(cancelled, false, {
          title: "No cancelled orders",
          body: "Good news: you haven't cancelled anything.",
        })}
      </TabsContent>
    </Tabs>
  );
}
