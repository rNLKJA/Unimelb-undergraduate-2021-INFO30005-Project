import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell, DemoCredentials } from "@/components/shared/auth-shell";
import { DemoBanner } from "@/components/shared/demo-banner";
import { DemoLoginButton } from "@/components/shared/demo-login";
import { VendorLoginForm } from "@/components/vendor/vendor-login-form";
import { DEMO_CREDENTIALS } from "@/db/seed-data";
import { currentVan } from "@/server/auth";
import { listVans } from "@/server/vans";

export const metadata: Metadata = { title: "Vendor log in" };

export default async function VendorLoginPage() {
  if (await currentVan()) redirect("/vendor/orders");
  const vans = await listVans();
  return (
    <AuthShell
      tone="vendor"
      title="Vendor log in"
      subtitle="Run your van: open up, set your spot and work through orders."
      aside={
        <>
          <p className="font-display text-3xl leading-tight font-semibold">Behind the hatch.</p>
          <p className="text-crema-200/85">
            Vans can&apos;t sign up themselves; every van in the demo shares the same demo password.
            The board refreshes every few seconds, so new orders appear on their own.
          </p>
        </>
      }
    >
      <div className="space-y-5">
        <DemoBanner />
        <DemoLoginButton
          role="vendor"
          formClassName="block"
          variant="secondary"
          className="h-11 w-full rounded-xl font-semibold"
        >
          Try as demo vendor (one click)
        </DemoLoginButton>
        <VendorLoginForm vanNames={vans.map((v) => v.vanId)} />
        <DemoCredentials
          rows={[
            ["Van ID", `${DEMO_CREDENTIALS.vendor.vanId} (or any van)`],
            ["Password", DEMO_CREDENTIALS.vendor.password],
          ]}
        />
      </div>
    </AuthShell>
  );
}
