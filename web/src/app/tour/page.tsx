import { ArrowRight, Clapperboard, Clock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { LazyVideo } from "@/components/tour/lazy-video";
import { ScreenshotGallery } from "@/components/tour/screenshot-gallery";
import { Button } from "@/components/ui/button";
import {
  SCREENSHOTS,
  TIME_LAPSE_LABEL,
  WALKTHROUGHS,
  type Walkthrough,
  walkthroughMedia,
} from "@/lib/showcase";
import { REPO_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Guided tour",
  description:
    "Three captioned walkthroughs (a customer orders, the vendor fulfils, the records area and A/B-test designer) and screenshots of every key feature, recorded by a reproducible Playwright script.",
};

const SPEC_URL = `${REPO_URL}/blob/main/web/e2e/showcase.spec.ts`;

function Section({
  id,
  eyebrow,
  title,
  intro,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 space-y-6">
      <div className="max-w-3xl space-y-2">
        <p className="text-sm font-semibold tracking-[0.16em] text-primary uppercase">{eyebrow}</p>
        <h2 id={`${id}-title`} className="text-3xl font-semibold">
          {title}
        </h2>
        {intro ? <div className="leading-relaxed text-muted-foreground">{intro}</div> : null}
      </div>
      {children}
    </section>
  );
}

/** "Steps 8 and 9" for two steps, "Steps 6 to 9" for a longer run, otherwise "Step 4". */
function stepRange(steps: readonly number[]) {
  const sorted = [...steps].sort((a, b) => a - b);
  if (sorted.length === 1) return `Step ${sorted[0]}`;
  const consecutive = sorted.every((s, i) => i === 0 || s === sorted[i - 1] + 1);
  if (sorted.length > 2 && consecutive) return `Steps ${sorted[0]} to ${sorted.at(-1)}`;
  return `Steps ${sorted.slice(0, -1).join(", ")} and ${sorted.at(-1)}`;
}

function WalkthroughSection({
  walkthrough: w,
  index,
}: {
  walkthrough: Walkthrough;
  index: number;
}) {
  const media = walkthroughMedia(w.id);
  const lapse = new Set(w.timeLapseSteps ?? []);
  const stepsId = `${w.id}-steps`;
  return (
    <Section
      id={w.id}
      eyebrow={`Walkthrough ${index + 1} of ${WALKTHROUGHS.length} · ${w.route}`}
      title={w.title}
      intro={<p>{w.summary}</p>}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <figure className="min-w-0 space-y-3">
          <LazyVideo
            src={media.mp4}
            poster={media.poster}
            captions={media.captions}
            label={`${w.title}: a ${w.steps.length}-step walkthrough with captions`}
            width={1280}
            height={800}
          />
          <figcaption className="flex flex-wrap items-start gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground">Setup:</span> {w.setup}
            </span>
            <a href={media.mp4} className="font-medium underline underline-offset-4">
              Open the MP4
            </a>
          </figcaption>
          {lapse.size > 0 ? (
            <p className="flex gap-2.5 rounded-2xl border border-dashed border-honey-500/60 bg-honey-300/15 p-3 text-sm">
              <Clock
                className="mt-0.5 size-4 shrink-0 text-espresso-800 dark:text-honey-300"
                aria-hidden
              />
              <span>
                <strong>{TIME_LAPSE_LABEL}.</strong> {stepRange([...lapse])} move the browser&apos;s
                clock forward so the 15-minute ring can run out in a few seconds. The order on the
                server keeps its real times; the vendor in walkthrough 2 sees a fresh order.
              </span>
            </p>
          ) : null}
        </figure>

        <div className="space-y-4">
          <h3 id={stepsId} className="font-semibold">
            Steps <span className="font-normal text-muted-foreground">(transcript)</span>
          </h3>
          <ol aria-labelledby={stepsId} className="space-y-2">
            {w.steps.map((step, k) => (
              <li key={step} className="flex gap-3 text-sm">
                <span className="tabular flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 px-1 text-xs font-semibold text-tomato-700 dark:text-tomato-300">
                  {k + 1}
                </span>
                <span className="pt-0.5">
                  {step}
                  {lapse.has(k + 1) ? (
                    <span className="block text-xs text-muted-foreground">{TIME_LAPSE_LABEL}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link href={w.route}>
              Try it yourself <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </Section>
  );
}

export default function TourPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <div className="mx-auto max-w-6xl space-y-16 px-4 py-10 sm:px-6 lg:py-14">
          <header className="max-w-3xl space-y-4">
            <p className="text-sm font-semibold tracking-[0.16em] text-primary uppercase">
              Guided tour
            </p>
            <h1 className="text-4xl font-semibold sm:text-5xl">Snacks in a Van in three videos</h1>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Each video follows one workflow from start to finish, with the step shown on screen
              and as captions: a customer orders from the nearest van, the vendor fulfils it on the
              live board, and the records area shows the audit trail, the analytics and the A/B-test
              designer. They were recorded by a Playwright script that also checks every step, on
              the committed demo data, so the same run reproduces the same journeys.
            </p>
            <nav aria-label="Walkthroughs" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {WALKTHROUGHS.map((w, i) => (
                <a
                  key={w.id}
                  href={`#${w.id}`}
                  className="font-medium underline underline-offset-4 hover:text-primary"
                >
                  {i + 1}. {w.title}
                </a>
              ))}
              <a
                href="#screenshots"
                className="font-medium underline underline-offset-4 hover:text-primary"
              >
                Screenshots
              </a>
            </nav>
          </header>

          {WALKTHROUGHS.map((w, i) => (
            <WalkthroughSection key={w.id} walkthrough={w} index={i} />
          ))}

          <Section
            id="screenshots"
            eyebrow="Screenshots"
            title="Every key feature at a glance"
            intro={
              <p>
                Captured by the same script at 1440 × 900 (the landing page in light and dark mode)
                and on a 390 px phone. Select one to enlarge it; the arrow keys step through the
                set.
              </p>
            }
          >
            <ScreenshotGallery items={SCREENSHOTS} />
          </Section>

          <section
            aria-labelledby="how-made"
            className="grid gap-4 rounded-3xl border bg-card p-5 shadow-sm sm:p-8 md:grid-cols-[auto_1fr]"
          >
            <Clapperboard className="size-6 text-primary" aria-hidden />
            <div className="space-y-2">
              <h2 id="how-made" className="text-xl font-semibold">
                How these were made
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
                  pnpm showcase
                </code>{" "}
                runs{" "}
                <a
                  href={SPEC_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  web/e2e/showcase.spec.ts
                </a>{" "}
                on the system Chrome: it plays each journey at a human pace with an on-screen
                caption and cursor, asserts what it shows (the nearest van, the order reaching the
                board, the tracker following the vendor, the sample size and both simulated runs)
                and records it at 1280 × 800. ffmpeg then encodes the H.264 videos on this page and
                the GIFs in the README. The captions here are the same text as the on-screen steps.
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                The recordings use the one-click demo accounts (no password is typed) and the
                synthetic demo data from a local production build. No AI key is entered: the
                bring-your-own-key settings are opened and closed, and no AI call is made.
              </p>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
