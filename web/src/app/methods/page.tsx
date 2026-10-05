import { ArrowRight, FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Markdown } from "@/components/methods/markdown";
import {
  meanDifferenceText,
  readCalibration,
  seedRange,
  shareWithCi,
} from "@/lib/content/calibration";
import { listDecisions, readDoc, withoutTitle } from "@/lib/content/docs";
import { REPO_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Methods & decisions",
  description:
    "Data provenance, the statistics behind the analytics and the A/B-test designer, evaluation design, assumptions, limitations, the AI use statement and the decision records.",
};

const TOC = [
  ["data", "Data provenance"],
  ["analytics", "Operations analytics"],
  ["experiments", "Experiment design"],
  ["evaluation", "Evaluation design"],
  ["governance", "Audit trail"],
  ["assumptions", "Assumptions"],
  ["limitations", "Limitations"],
  ["changes", "What I'd change"],
  ["ai-use", "AI use statement"],
  ["privacy", "Privacy & retention"],
  ["decisions", "Decision records"],
] as const;

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 space-y-3">
      <h2 id={`${id}-title`} className="text-2xl font-semibold">
        {title}
      </h2>
      <div className="space-y-3 leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}

const Code = ({ children }: { children: ReactNode }) => (
  <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] [overflow-wrap:anywhere]">
    {children}
  </code>
);

export default function MethodsPage() {
  const decisions = listDecisions();
  const calibration = readCalibration();
  const [effectRow, aaRow] = calibration.rows;
  const { design: calDesign, peeking } = calibration;
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      <header className="max-w-3xl space-y-4">
        <p className="text-sm font-semibold tracking-[0.16em] text-primary uppercase">
          Methods &amp; decisions
        </p>
        <h1 className="text-4xl font-semibold sm:text-5xl">How the numbers are made</h1>
        <p className="text-lg leading-relaxed text-muted-foreground">
          The 2026 upgrade adds operations analytics, an A/B-test designer for the 15-minute
          late-discount rule, an append-only audit trail and an optional AI shift summary. This page
          says where the data comes from, which methods produce each figure, how they were checked,
          what they assume and where they fall short. The upgrade leaves the ported 2021 rules and
          their tests unchanged; the new work sits around them.
        </p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="On this page" className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-2 text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">
            On this page
          </p>
          <ol className="flex flex-wrap gap-1.5 text-sm lg:flex-col lg:gap-0.5">
            {TOC.map(([id, label]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="block rounded-lg border px-2.5 py-1 text-muted-foreground hover:bg-secondary hover:text-foreground lg:border-0"
                >
                  {label}
                </a>
              </li>
            ))}
            <li>
              <Link
                href="/methods/model-card"
                className="block rounded-lg border px-2.5 py-1 font-medium text-primary hover:bg-secondary lg:border-0"
              >
                Model and data card →
              </Link>
            </li>
          </ol>
        </nav>

        <div className="max-w-3xl min-w-0 space-y-12">
          <Section id="data" title="Data provenance">
            <p>
              The original MongoDB database no longer exists, so everything on the site comes from a
              deterministic seed (<Code>web/src/db/seed.ts</Code>, PRNG seed 4399): the eight-item
              menu recovered from a page the 2021 app rendered, 15 van names from the team&apos;s
              original list (names only), 10 synthetic customers on reserved example domains, and
              three weeks of orders generated with the app&apos;s own pricing and order-id code.
              Minutes from order to ready are drawn uniformly between 4 and 21, so about a third of
              orders are late by construction. Live activity on the public site adds to that, and
              since it moved to a shared database it persists.
            </p>
            <p>
              <strong>Consequence:</strong> the analytics demonstrate the methods; they are not
              findings about real vans. Full provenance is in the{" "}
              <Link href="/methods/model-card" className="underline underline-offset-4">
                model and data card
              </Link>
              .
            </p>
          </Section>

          <Section id="analytics" title="Operations analytics">
            <p>
              <Link href="/admin/analytics" className="underline underline-offset-4">
                /admin/analytics
              </Link>{" "}
              (one-click demo admin) computes, from every order in the database:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong>Orders per day</strong> by Melbourne calendar day over 21 days, with the
                mean of complete days and a percentile-bootstrap 95% interval (2,000 resamples, seed
                4399). Today is partial and excluded from the mean.
              </li>
              <li>
                <strong>Minutes from order to ready</strong> for served orders: a histogram, the
                median and 90th percentile with bootstrap intervals, and the share ready within 15
                minutes with a Wilson interval.
              </li>
              <li>
                <strong>Time to fulfil</strong> as a Kaplan–Meier curve (shown as the share ready, 1
                − S(t)) with Greenwood standard errors and log-log 95% intervals. Orders still being
                prepared are right-censored at their current age; cancelled orders are left out and
                counted separately.
              </li>
              <li>
                <strong>Housekeeping close-outs.</strong> A demo login closes out demo orders still
                active after 90 minutes and gives them an invented ready time so the order screens
                stay coherent. Those orders are flagged: their invented times are left out of every
                figure, the Kaplan–Meier curve censors them at their age when closed out, and the
                page states how many there were (
                <Link
                  href="/methods/decisions/DR-005-censor-housekeeping-close-outs"
                  className="underline underline-offset-4"
                >
                  DR-005
                </Link>
                ).
              </li>
              <li>
                <strong>Late-discount rate by van</strong>: late served orders over all served
                orders, with Wilson 95% intervals, as a dot-and-interval plot so that small vans
                visibly carry wide intervals.
              </li>
            </ul>
            <p>Every figure states its n. Every chart has a data table underneath.</p>
          </Section>

          <Section id="experiments" title="Experiment design">
            <p>
              <Link href="/admin/experiments" className="underline underline-offset-4">
                /admin/experiments
              </Link>{" "}
              plans an A/B test of the late-discount rule: does promising a discount after 10
              minutes instead of 15 bring customers back?
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong>Unit of randomisation: the customer.</strong> Each customer sees one rule
                throughout, and the analysis is per customer, so repeat orders from one person never
                count as independent evidence.
              </li>
              <li>
                <strong>One primary metric, chosen in advance</strong>: repeat order within 14 days,
                or a 4 or 5 star rating on the first order (a customer who does not rate counts as
                &quot;no&quot;). Its baseline is estimated with the same denominator: every
                non-cancelled demo order, rated or not, not only the rated ones. Guardrail: the
                share of first orders discounted (the cost of the promise).
              </li>
              <li>
                <strong>Sample size</strong> for two proportions with the pooled-variance normal
                formula, n<sub>1</sub> = ((z<sub>1−α/2</sub>σ<sub>0</sub> + z<sub>power</sub>σ
                <sub>1</sub>) / δ)², where σ<sub>0</sub> uses the pooled rate under H<sub>0</sub>{" "}
                and σ<sub>1</sub> the two arms&apos; own rates; Cohen&apos;s h (arcsine) as a
                cross-check. For a mean (stars), the two-mean formula with d = δ/σ, solved exactly
                for the z-test and with Guenther&apos;s correction for the t-test. All match
                statsmodels.
              </li>
              <li>
                <strong>Analysis</strong> of a simulated run: Wilson intervals per arm,
                Newcombe&apos;s hybrid score interval for the difference, Cohen&apos;s h and the
                relative lift as effect sizes, the pooled z-test, a seeded Monte Carlo permutation
                test (5,000 relabellings) and the exact permutation test (enumerated through the
                hypergeometric distribution). Every interval is built at level 1 − α for the α
                chosen, so the interval and the test answer the same question. The export carries
                the seed and the fulfilment pool, everything needed to rerun it.
              </li>
              <li>
                <strong>Peeking</strong>: 10,000 simulated A/A tests show how stopping at the first
                p &lt; 0.05 inflates false positives, and how Pocock&apos;s group-sequential
                boundary restores the planned α. Simulations run in a Web Worker, and the peeking
                one is capped at 5,000 customers per arm, so a tiny minimum detectable effect cannot
                freeze the page; a zero effect has no sample size and is refused.
              </li>
            </ul>
          </Section>

          <Section id="evaluation" title="Evaluation design">
            <p>The statistics are checked in two independent ways.</p>
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>
                <strong>Against reference software.</strong> Every estimator is pinned to values
                computed outside the app: statsmodels and scipy via{" "}
                <Code>scripts/verify_stats.py</Code> (uv) and R&apos;s survival package via{" "}
                <Code>scripts/verify_km.R</Code>. Agreement is to 12 decimal places for the
                intervals, tests and Kaplan–Meier steps.
              </li>
              <li>
                <strong>Against known truth.</strong> The experiment simulation injects a known
                effect, so its analysis can be scored. <Code>pnpm calibrate</Code> (
                <Code>web/scripts/calibrate-simulation.ts</Code>) runs{" "}
                {effectRow.reps.toLocaleString("en-AU")} simulated experiments per row at{" "}
                {calDesign.perArm} customers per arm, baseline{" "}
                {Math.round(calDesign.baseline * 100)}%, α = {calDesign.alpha}, and writes{" "}
                <Code>docs/calibration.json</Code>, which this table is read from. The test suite
                re-runs both rows from the seeds and resampling pool recorded in that file and
                checks they match exactly; a faster 300-run check guards the simulation itself.
              </li>
            </ol>
            <p id="calibration-caption" className="text-sm text-muted-foreground">
              Calibration against known truth. Shares carry Wilson 95% intervals for simulation
              error; the mean difference carries its Monte Carlo standard error.
            </p>
            <div
              className="overflow-x-auto rounded-2xl border"
              tabIndex={0}
              role="region"
              aria-labelledby="calibration-caption"
            >
              <table className="w-full min-w-[640px] text-left text-sm">
                <caption className="sr-only">Calibration against known truth</caption>
                <thead className="text-xs text-muted-foreground">
                  <tr className="border-b">
                    <th scope="col" className="px-4 py-2 font-medium">
                      Injected effect
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Mean estimate
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      {Math.round(calDesign.intervalLevel * 100)}% interval covers the truth
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      z-test rejects H0
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Exact test rejects H0
                    </th>
                  </tr>
                </thead>
                <tbody className="tabular">
                  {[
                    {
                      row: effectRow,
                      label: `+${Math.round(effectRow.injectedEffect * 100)} points`,
                      target: `planned power ${Math.round(calDesign.plannedPower * 100)}%`,
                    },
                    {
                      row: aaRow,
                      label: "0 (A/A)",
                      target: `nominal ${Math.round(calDesign.alpha * 100)}%`,
                    },
                  ].map(({ row, label, target }) => (
                    <tr key={label} className="border-b align-top last:border-0">
                      <th scope="row" className="px-4 py-2 font-medium">
                        {label}
                        <span className="block text-xs font-normal text-muted-foreground">
                          {seedRange(row)}
                        </span>
                      </th>
                      <td className="px-4 py-2">{meanDifferenceText(row)}</td>
                      <td className="px-4 py-2">{shareWithCi(row.coverage, false)}</td>
                      <td className="px-4 py-2">
                        {shareWithCi(row.rejectZ, false)}
                        <span className="block text-xs text-muted-foreground">{target}</span>
                      </td>
                      <td className="px-4 py-2">{shareWithCi(row.rejectExact, false)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              Peeking ({peeking.reps.toLocaleString("en-AU")} A/A experiments, seed {peeking.seed},{" "}
              {peeking.looks} looks): looking once rejects{" "}
              {shareWithCi(peeking.fixedHorizon, false)}, stopping at the first p &lt; 0.05 rejects{" "}
              {shareWithCi(peeking.stopAtFirstSignificantLook, false)}
              {peeking.pocock ? (
                <>
                  , and Pocock&apos;s boundary (|z| &gt; {peeking.pocockZ}) brings it back to{" "}
                  {shareWithCi(peeking.pocock, false)}
                </>
              ) : null}
              . Resampling pool: {calibration.fulfilmentPool.size} served orders from the seed
              snapshot (SHA-256 <Code>{calibration.fulfilmentPool.sha256.slice(0, 12)}…</Code>).
            </p>
            <p>
              The 2021 business rules keep their own parity tests, which run the original JavaScript
              next to the TypeScript ports.
            </p>
          </Section>

          <Section id="governance" title="Audit trail">
            <p>
              Order status changes (by vendors, customers cancelling, or the automated demo
              housekeeping), van open/close and location changes, sign-ins to the vendor and admin
              portals, CSV exports and AI review decisions are written to an{" "}
              <strong>append-only</strong> <Code>audit_log</Code> table in the same database batch
              as the change itself. SQLite triggers reject any UPDATE or DELETE on it; the only way
              rows leave is a full demo reset that wipes every table. It is visible in{" "}
              <Link href="/admin/records?table=audit_log" className="underline underline-offset-4">
                the records area
              </Link>{" "}
              with search and CSV export.
            </p>
          </Section>

          <Section id="assumptions" title="Assumptions">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Orders are independent of each other within a van and a day.</li>
              <li>
                Censoring of open orders is non-informative: an order still being prepared is as
                likely to finish soon as any other order of the same age.
              </li>
              <li>
                In the simulation, the rule changes the promise, not the crew&apos;s speed, and
                customers do not influence each other.
              </li>
              <li>
                The repeat-order baseline (35%) and 40 new customers a day are assumptions, not
                estimates: 10 synthetic customers cannot estimate them.
              </li>
            </ul>
          </Section>

          <Section id="limitations" title="Limitations">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>The data is synthetic; patterns reflect the generator.</li>
              <li>
                Per-van samples are small (4 to 44 served orders in the snapshot), so intervals
                overlap heavily: the data cannot rank crews.
              </li>
              <li>
                AI audit records are reported by the vendor&apos;s browser. The server checks the
                prompt, the output format and the fact check, but cannot prove a record matches a
                real provider response (
                <Link
                  href="/methods/decisions/DR-006-verifying-client-reported-ai-records"
                  className="underline underline-offset-4"
                >
                  DR-006
                </Link>
                ).
              </li>
              <li>
                Cancellations are treated as a separate outcome, not as competing risks in the
                curve.
              </li>
              <li>
                The nearest-van ranking keeps the 2021 degree-space distance for parity, which
                overstates east-west distances by about 27% at Melbourne&apos;s latitude.
              </li>
              <li>
                <strong>Production storage.</strong> The public deployment ran on a separate copy of
                the database per serverless instance until 6 October 2026, so writes there were
                temporary (
                <Link
                  href="/methods/decisions/DR-004-turso-vs-tmp-fallback"
                  className="underline underline-offset-4"
                >
                  DR-004
                </Link>
                ). It now uses a shared Turso database in Tokyo while the functions run in Sydney,
                and the seeded history is no longer re-dated, so it ages in place (
                <Link
                  href="/methods/decisions/DR-007-production-on-turso"
                  className="underline underline-offset-4"
                >
                  DR-007
                </Link>
                ).
              </li>
            </ul>
          </Section>

          <Section id="changes" title="What I'd change">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Connect the shared database before adding any feature that writes.</li>
              <li>Record the discount amount, so the guardrail can be measured in dollars.</li>
              <li>
                Model cancellations as a competing risk (cumulative incidence) instead of dropping
                them from the curve.
              </li>
              <li>
                Pre-register the experiment&apos;s analysis in the repository before any real
                launch, and add an always-valid sequential test for monitoring.
              </li>
            </ul>
          </Section>

          <section id="ai-use" aria-labelledby="ai-use-title" className="scroll-mt-24 space-y-3">
            <h2 id="ai-use-title" className="text-2xl font-semibold">
              AI use statement
            </h2>
            <div className="rounded-3xl border bg-card p-5 shadow-sm sm:p-7">
              <Markdown source={withoutTitle(readDoc("ai-use-statement.md"))} nestedHeadings />
            </div>
          </section>

          <section id="privacy" aria-labelledby="privacy-title" className="scroll-mt-24 space-y-3">
            <h2 id="privacy-title" className="text-2xl font-semibold">
              Privacy &amp; retention
            </h2>
            <div className="rounded-3xl border bg-card p-5 shadow-sm sm:p-7">
              <Markdown source={withoutTitle(readDoc("privacy-and-retention.md"))} nestedHeadings />
            </div>
          </section>

          <Section id="decisions" title="Decision records">
            <p>
              Each record states the decision first, then the context, the options, why, what
              actually happened (weak numbers included) and what I would change. Past records are
              never edited; a later one supersedes them.
            </p>
            <ul className="grid gap-3 sm:grid-cols-2">
              {decisions.map((d) => (
                <li key={d.slug}>
                  <Link
                    href={`/methods/decisions/${d.slug}`}
                    className="group flex h-full flex-col gap-2 rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:bg-secondary"
                  >
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                      <FileText className="size-3.5" aria-hidden /> {d.id}
                    </span>
                    <span className="font-semibold">{d.title}</span>
                    <span className="mt-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                      Read <ArrowRight className="size-3" aria-hidden />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground">
              Sources in{" "}
              <a
                href={`${REPO_URL}/tree/main/docs`}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4"
              >
                docs/
              </a>{" "}
              on GitHub.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
