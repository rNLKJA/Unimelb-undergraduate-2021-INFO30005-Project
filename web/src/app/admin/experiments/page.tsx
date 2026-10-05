import type { Metadata } from "next";
import Link from "next/link";
import { ExperimentDesigner } from "@/components/admin/experiment-designer";
import { PageIntro } from "@/components/admin/page-intro";
import { requireAdmin } from "@/server/auth";
import { experimentFacts } from "@/server/analytics";

export const metadata: Metadata = { title: "Experiment designer" };

export default async function ExperimentsPage() {
  await requireAdmin();
  const facts = await experimentFacts();
  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6">
      <PageIntro eyebrow="Records · experiments" title="A/B test the 15-minute late-discount rule">
        <p>
          Since 2021 an order that is not ready within 15 minutes gets the late-order discount.
          Would a stronger promise bring customers back? This page plans that experiment the way it
          should be run: hypothesis and primary metric first, a sample size from the minimum effect
          worth detecting, a dry run on synthetic customers with a known effect, and a warning about
          peeking. No real customers are randomised and nothing here changes the app&apos;s rule.
          Formulas and assumptions:{" "}
          <Link
            href="/methods#experiments"
            className="font-medium text-foreground underline underline-offset-4"
          >
            /methods
          </Link>
          .
        </p>
      </PageIntro>
      <ExperimentDesigner facts={facts} />
    </div>
  );
}
