import { LogOut, MessagesSquare, ReceiptText, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { customerLogoutAction } from "@/app/customer/actions";
import { AvatarPicker } from "@/components/customer/avatar-picker";
import { PasswordForm } from "@/components/customer/password-form";
import { avatarSrc, SnackImage } from "@/components/shared/snack-image";
import { Button } from "@/components/ui/button";
import { AVATAR_CHOICES, DEMO_CREDENTIALS } from "@/db/seed-data";
import { formatDate } from "@/lib/format";
import { requireCustomer } from "@/server/auth";
import { postCountBy } from "@/server/community";
import { customerOrderCounts, favouriteSnack } from "@/server/orders";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const customer = await requireCustomer("/customer/profile");
  const [counts, posts, favourite] = await Promise.all([
    customerOrderCounts(customer.customerId),
    postCountBy(customer.customerId),
    favouriteSnack(customer.customerId),
  ]);
  const isDemo = customer.customerId === DEMO_CREDENTIALS.customer.customerId;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <section className="flex flex-col items-start gap-5 rounded-3xl border bg-card p-6 shadow-sm sm:flex-row sm:items-center">
        <SnackImage
          src={avatarSrc(customer.portfolioImg)}
          alt=""
          size={96}
          className="size-24 rounded-full ring-4 ring-secondary"
          priority
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-semibold">
            {customer.firstName} {customer.lastName}
          </h1>
          <p className="truncate text-sm text-muted-foreground">
            Snacker ID: <span className="font-medium text-foreground">{customer.customerId}</span>
          </p>
          <p className="text-xs text-muted-foreground">Joined {formatDate(customer.createdAt)}</p>
        </div>
        <form action={customerLogoutAction}>
          <Button type="submit" variant="outline" className="h-10 rounded-full px-4">
            <LogOut aria-hidden /> Log out
          </Button>
        </form>
      </section>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: ReceiptText, label: "In progress", value: counts.active },
          { icon: ReceiptText, label: "Completed", value: counts.completed },
          { icon: MessagesSquare, label: "Board posts", value: posts },
          { icon: Sparkles, label: "Favourite", value: favourite?.food ?? "—" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border bg-card p-4">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <s.icon className="size-3.5" aria-hidden /> {s.label}
            </dt>
            <dd className="tabular mt-1 truncate font-display text-xl font-semibold">{s.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-3xl border bg-card p-6 shadow-sm">
          <AvatarPicker current={customer.portfolioImg ?? "flat-white"} choices={AVATAR_CHOICES} />
        </section>
        <section className="rounded-3xl border bg-card p-6 shadow-sm" aria-labelledby="pw">
          <h2 id="pw" className="mb-4 text-lg font-semibold">
            Change password
          </h2>
          {isDemo ? (
            <p className="mb-4 rounded-2xl bg-secondary px-3 py-2 text-xs text-muted-foreground">
              This is the shared demo account, so its password is locked. Sign up for your own
              throwaway account to try this form.
            </p>
          ) : null}
          <PasswordForm />
        </section>
      </div>
    </div>
  );
}
