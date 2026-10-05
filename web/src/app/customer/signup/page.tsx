import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CustomerSignupForm } from "@/components/customer/signup-form";
import { AuthShell } from "@/components/shared/auth-shell";
import { DemoBanner } from "@/components/shared/demo-banner";
import { avatarSrc, SnackImage } from "@/components/shared/snack-image";
import { currentCustomer, safeNext } from "@/server/auth";

export const metadata: Metadata = { title: "Become a snacker" };

export default async function CustomerSignupPage(props: PageProps<"/customer/signup">) {
  const params = await props.searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : undefined, "/customer");
  if (await currentCustomer()) redirect(next);
  return (
    <AuthShell
      title="Become a snacker"
      subtitle="Create an account to order from any van."
      aside={
        <>
          <p className="font-display text-3xl leading-tight font-semibold">
            New snacker? Welcome aboard.
          </p>
          <p className="text-white">
            Use any made-up email address. Passwords are hashed with bcrypt, but this is a public
            demo, so please don&apos;t reuse a real one.
          </p>
          <div className="flex gap-3 pt-4" aria-hidden>
            {["latte", "plain-biscuit", "large-cake"].map((key, i) => (
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
        <CustomerSignupForm next={next} />
      </div>
    </AuthShell>
  );
}
