import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { AuthShell, DemoCredentials } from "@/components/shared/auth-shell";
import { DemoBanner } from "@/components/shared/demo-banner";
import { DemoLoginButton } from "@/components/shared/demo-login";
import { DEMO_CREDENTIALS } from "@/db/seed-data";
import { currentAdmin } from "@/server/auth";

export const metadata: Metadata = { title: "Records log in" };

export default async function AdminLoginPage() {
  if (await currentAdmin()) redirect("/admin/records");
  return (
    <AuthShell
      tone="admin"
      title="Records"
      subtitle="Browse every table in the demo database, read-only."
      aside={
        <>
          <p className="font-display text-3xl leading-tight font-semibold">Look under the hood.</p>
          <p className="opacity-80">
            Customers, vans, orders, order items, blog posts and the menu, with search, record
            counts and CSV export. Password hashes are always hidden.
          </p>
        </>
      }
    >
      <div className="space-y-5">
        <DemoBanner />
        <DemoLoginButton
          role="admin"
          formClassName="block"
          variant="secondary"
          className="h-11 w-full rounded-xl font-semibold"
        >
          Try as demo admin (one click)
        </DemoLoginButton>
        <AdminLoginForm />
        <DemoCredentials
          rows={[
            ["Username", DEMO_CREDENTIALS.admin.username],
            ["Password", DEMO_CREDENTIALS.admin.password],
          ]}
        />
      </div>
    </AuthShell>
  );
}
