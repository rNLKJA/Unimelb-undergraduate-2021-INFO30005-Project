import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CustomerLoginForm } from "@/components/customer/login-form";
import { AuthShell, DemoCredentials } from "@/components/shared/auth-shell";
import { DemoBanner } from "@/components/shared/demo-banner";
import { DemoLoginButton } from "@/components/shared/demo-login";
import { avatarSrc, SnackImage } from "@/components/shared/snack-image";
import { DEMO_CREDENTIALS } from "@/db/seed-data";
import { currentCustomer, safeNext } from "@/server/auth";

export const metadata: Metadata = { title: "Customer log in" };

export default async function CustomerLoginPage(props: PageProps<"/customer/login">) {
  const params = await props.searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : undefined, "/customer");
  if (await currentCustomer()) redirect(next);
  return (
    <AuthShell
      title="Welcome back, snacker"
      subtitle="Log in to order ahead and track your coffee."
      aside={
        <>
          <p className="font-display text-3xl leading-tight font-semibold">
            Your flat white is five minutes away.
          </p>
          <p className="text-white">
            Browse the map and menu without an account; you only need to log in when you place an
            order.
          </p>
          <div className="flex gap-3 pt-4" aria-hidden>
            {["flat-white", "fancy-biscuit", "small-cake"].map((key, i) => (
              <SnackImage
                key={key}
                src={avatarSrc(key)}
                alt=""
                size={88}
                className={i === 1 ? "-translate-y-2 rotate-6" : "-rotate-3"}
              />
            ))}
          </div>
        </>
      }
    >
      <div className="space-y-5">
        <DemoBanner />
        <DemoLoginButton
          role="customer"
          autoSubmit={params.demo === "1"}
          next={next}
          formClassName="block"
          variant="secondary"
          className="h-11 w-full rounded-xl font-semibold"
        >
          Try as demo customer (one click)
        </DemoLoginButton>
        <CustomerLoginForm next={next} />
        <DemoCredentials
          rows={[
            ["Snacker ID", DEMO_CREDENTIALS.customer.customerId],
            ["Password", DEMO_CREDENTIALS.customer.password],
          ]}
        />
      </div>
    </AuthShell>
  );
}
