import { MessagesSquare, Quote, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PostComposer } from "@/components/customer/post-composer";
import { DemoLoginButton } from "@/components/shared/demo-login";
import { EmptyState } from "@/components/shared/empty-state";
import { avatarSrc, SnackImage } from "@/components/shared/snack-image";
import { Stars } from "@/components/shared/stars";
import { Button } from "@/components/ui/button";
import { relativeMinutes } from "@/lib/format";
import { currentCustomer } from "@/server/auth";
import { serverNow } from "@/server/clock";
import { listPosts, recentRatings } from "@/server/community";
import { listVans } from "@/server/vans";

export const metadata: Metadata = {
  title: "Community",
  description: "Stories from snackers and the latest ratings for every van.",
};

export default async function CommunityPage() {
  const customer = await currentCustomer();
  const [posts, ratings, vans] = await Promise.all([
    listPosts(customer?.customerId ?? null),
    recentRatings(12),
    listVans(),
  ]);
  const now = serverNow();
  const leaderboard = vans
    .filter((v) => v.rating && v.rating.count >= 2)
    .sort((a, b) => b.rating!.average - a.rating!.average || b.rating!.count - a.rating!.count)
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-semibold">Community</h1>
        <p className="mt-1 text-muted-foreground">
          The snackers&apos; board (our 2021 blog bonus feature) and the latest ratings from
          collected orders.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.25fr_0.75fr]">
        <section aria-labelledby="board" className="min-w-0 space-y-4">
          <h2 id="board" className="flex items-center gap-2 text-xl font-semibold">
            <MessagesSquare className="size-5 text-primary" aria-hidden /> Snackers&apos; board
          </h2>
          {customer ? (
            <PostComposer name={customer.firstName} />
          ) : (
            <div className="flex flex-col gap-3 rounded-3xl border border-dashed bg-card/60 p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">Log in to share your own story.</p>
              <div className="flex gap-2">
                <DemoLoginButton
                  role="customer"
                  next="/customer/community"
                  className="h-10 rounded-full px-4"
                >
                  Try as demo customer
                </DemoLoginButton>
                <Button asChild variant="outline" className="h-10 rounded-full px-4">
                  <Link href="/customer/login?next=/customer/community">Log in</Link>
                </Button>
              </div>
            </div>
          )}
          {posts.length === 0 ? (
            <EmptyState icon={<MessagesSquare />} title="No posts yet">
              Be the first to share where you found the best flat white.
            </EmptyState>
          ) : (
            <ul className="space-y-3">
              {posts.map((post) => (
                <li key={post.id} className="flex gap-3 rounded-3xl border bg-card p-4 shadow-sm">
                  <SnackImage
                    src={avatarSrc(post.avatar)}
                    alt=""
                    size={44}
                    className="size-11 shrink-0 rounded-full"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                      <span className="font-semibold">{post.authorName}</span>
                      {post.mine ? (
                        <span className="rounded-full bg-primary/10 px-1.5 text-[0.68rem] font-semibold text-tomato-700 dark:text-tomato-300">
                          you
                        </span>
                      ) : null}
                      <time
                        className="text-xs text-muted-foreground"
                        dateTime={new Date(post.createdAt).toISOString()}
                      >
                        {relativeMinutes(now - post.createdAt)}
                      </time>
                    </p>
                    <p className="mt-1 text-[0.95rem] leading-relaxed break-words whitespace-pre-line">
                      {post.content}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="min-w-0 space-y-6">
          <section aria-labelledby="leaders" className="rounded-3xl border bg-card p-5 shadow-sm">
            <h2 id="leaders" className="flex items-center gap-2 text-lg font-semibold">
              <Trophy className="size-5 text-honey-500" aria-hidden /> Top-rated vans
            </h2>
            {leaderboard.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Not enough ratings yet.</p>
            ) : (
              <ol className="mt-3 space-y-2.5">
                {leaderboard.map((van, i) => (
                  <li key={van.vanId} className="flex items-center gap-3">
                    <span className="grid size-7 place-items-center rounded-full bg-secondary text-sm font-bold">
                      {i + 1}
                    </span>
                    <Link
                      href={`/customer/van/${van.slug}/menu`}
                      className="min-w-0 flex-1 truncate font-medium hover:underline"
                    >
                      {van.vanId}
                    </Link>
                    <span className="flex items-center gap-1.5 text-sm">
                      <Stars value={van.rating!.average} size="size-3.5" />
                      <span className="tabular font-semibold">
                        {van.rating!.average.toFixed(1)}
                      </span>
                      <span className="text-xs text-muted-foreground">({van.rating!.count})</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section aria-labelledby="ratings" className="space-y-3">
            <h2 id="ratings" className="flex items-center gap-2 text-lg font-semibold">
              <Quote className="size-5 text-primary" aria-hidden /> Recent ratings
            </h2>
            {ratings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No ratings yet.</p>
            ) : (
              <ul className="space-y-3">
                {ratings.map((r) => (
                  <li key={r.orderId} className="rounded-2xl border bg-card p-4">
                    <div className="flex items-center justify-between gap-2">
                      <Stars value={r.rating} size="size-3.5" />
                      <span className="text-xs text-muted-foreground">
                        {relativeMinutes(now - r.at)}
                      </span>
                    </div>
                    {r.comment ? <p className="mt-2 text-sm">&ldquo;{r.comment}&rdquo;</p> : null}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {r.customerName} at{" "}
                      <span className="font-medium text-foreground">{r.vanId}</span> ·{" "}
                      {r.items.join(", ")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
