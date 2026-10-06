import {
  ArrowRight,
  BadgePercent,
  ChefHat,
  CirclePlay,
  Clock,
  Database,
  LayoutDashboard,
  MapPinned,
  MessageSquare,
  Navigation,
  ScrollText,
  ShoppingBag,
  Star,
  Store,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { GithubMark } from "@/components/brand/github-mark";
import { LiveDemoStory } from "@/components/landing/live-demo-story";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { DemoLoginButton } from "@/components/shared/demo-login";
import { SnackImage } from "@/components/shared/snack-image";
import { MENU } from "@/lib/menu";
import { formatPrice } from "@/lib/pricing";
import { COURSEWORK_URL, REPO_URL, TEAM } from "@/lib/site";

const STEPS = [
  {
    icon: Navigation,
    title: "Find a van nearby",
    body: "Share your location or drop a pin. Open vans are ranked by distance and the five closest are highlighted, exactly as the 2021 controller did it.",
  },
  {
    icon: ShoppingBag,
    title: "Order ahead",
    body: "Pick from the eight-item menu and place your order. You have ten minutes to change your mind or cancel.",
  },
  {
    icon: Timer,
    title: "Ready in 15, or it's discounted",
    body: "Every order carries a 15-minute promise. If the van runs late, the order is flagged for the late-order discount.",
  },
] as const;

const FACTS = [
  { value: "2", label: "portals: customers & vendors" },
  { value: "5", label: "data models, ported to SQL" },
  { value: "25", label: "Handlebars pages in 2021" },
  { value: "8", label: "snacks on the menu" },
  { value: "5", label: "nearest vans shown" },
  { value: "15 min", label: "pickup promise" },
] as const;

const STACK = [
  [
    "Web framework",
    "Express 4 + Handlebars views",
    "Next.js 16 App Router: Server Components, Server Actions, Route Handlers",
  ],
  [
    "Database",
    "MongoDB Atlas + Mongoose (now gone)",
    "SQLite / libSQL (Turso in production) + Drizzle ORM, seeded demo data",
  ],
  [
    "Auth",
    "Passport-local + express-session",
    "bcrypt + signed httpOnly session cookies (jose), one per portal",
  ],
  [
    "Maps & places",
    "Google Maps JS API + OpenCage",
    "MapLibre GL + OpenFreeMap tiles + Photon geocoding, no API keys",
  ],
  ["Styling", "Hand-written CSS per page", "Tailwind CSS v4 + shadcn/ui, light and dark themes"],
  ["Live updates", "Full page reload every 60 s", "Polling Route Handlers every 3–4 s with SWR"],
  [
    "Testing",
    "Jest + Supertest",
    "Vitest unit and parity tests run against the original JavaScript",
  ],
  ["Hosting", "Heroku", "Vercel"],
] as const;

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        {/* Hero ------------------------------------------------------------ */}
        <section className="relative overflow-hidden">
          <div className="bg-grain absolute inset-0 -z-10 opacity-60" />
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 pb-16 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:pt-16">
            <div className="space-y-7">
              <p className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border bg-card/80 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm sm:rounded-full">
                <span className="font-semibold text-foreground">INFO30005</span>
                <span aria-hidden>·</span> University of Melbourne <span aria-hidden>·</span> 2021,
                revived 2026
              </p>
              <h1 className="font-display text-[2.6rem] leading-[1.02] font-semibold sm:text-6xl">
                Coffee from the van <span className="text-primary">around the corner.</span>
              </h1>
              <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
                <strong className="font-semibold text-foreground">Snacks in a Van</strong> is the
                food-ordering app our team built for a 2021 web-technologies brief: find the nearest
                roving snack van, order ahead and pick it up, while the crew inside runs a live
                order board. It is back as a full-stack Next.js app with a real database and a free,
                key-less map.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <DemoLoginButton
                  role="customer"
                  className="h-12 rounded-full px-6 text-base font-semibold"
                >
                  Try as customer <ArrowRight className="size-5" aria-hidden />
                </DemoLoginButton>
                <DemoLoginButton
                  role="vendor"
                  variant="outline"
                  className="h-12 rounded-full px-6 text-base font-semibold"
                >
                  Try as vendor
                </DemoLoginButton>
                <DemoLoginButton
                  role="admin"
                  variant="secondary"
                  className="h-12 rounded-full px-5 text-base"
                >
                  <Database className="size-4" aria-hidden /> Records
                </DemoLoginButton>
              </div>
              <p className="text-sm text-muted-foreground">
                One click, no sign-up. Tip: open the customer and vendor demos in two tabs and watch
                an order move between them.
              </p>
              <Link
                href="/tour"
                className="inline-flex items-center gap-2 rounded-full text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                <CirclePlay className="size-5" aria-hidden /> Watch the guided tour: three short
                videos
              </Link>
            </div>
            <LiveDemoStory />
          </div>
        </section>

        <div aria-hidden>
          <div className="bg-awning h-5 w-full" />
          <div className="awning-scallop h-[11px] w-full" />
        </div>

        {/* How it works --------------------------------------------------- */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6" aria-labelledby="how">
          <div className="max-w-2xl space-y-3">
            <p className="text-sm font-semibold tracking-[0.16em] text-primary uppercase">
              How it works
            </p>
            <h2 id="how" className="text-3xl font-semibold sm:text-4xl">
              Three steps from craving to cup
            </h2>
          </div>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="relative rounded-3xl border bg-card p-6 shadow-sm">
                <span
                  className="absolute top-5 right-6 font-display text-5xl font-semibold text-secondary"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <step.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-5 text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Two portals ---------------------------------------------------- */}
        <section className="border-y bg-surface/70" aria-labelledby="portals">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="max-w-2xl space-y-3">
              <p className="text-sm font-semibold tracking-[0.16em] text-primary uppercase">
                Two portals
              </p>
              <h2 id="portals" className="text-3xl font-semibold sm:text-4xl">
                Built for both sides of the serving hatch
              </h2>
            </div>
            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <article className="flex flex-col rounded-3xl border bg-card p-7 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl bg-tomato-600 text-white">
                    <ShoppingBag className="size-5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-xl font-semibold">Customer app</h3>
                    <p className="text-sm text-muted-foreground">
                      Mobile-first, like a modern food-ordering app
                    </p>
                  </div>
                </div>
                <ul className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                  {[
                    [MapPinned, "Map of the five nearest open vans"],
                    [ShoppingBag, "Menu, cart and checkout"],
                    [Clock, "Live status timeline and 15-minute ring"],
                    [ScrollText, "Change or cancel within 10 minutes"],
                    [Star, "Rate your orders, as in 2021"],
                    [MessageSquare, "Community board and ratings"],
                  ].map(([Icon, text]) => {
                    const I = Icon as typeof Star;
                    return (
                      <li key={text as string} className="flex items-start gap-2.5">
                        <I className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                        <span>{text as string}</span>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-auto pt-7">
                  <Link
                    href="/customer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                  >
                    Open the customer app <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </div>
              </article>
              <article className="flex flex-col rounded-3xl border bg-espresso-900 p-7 text-crema-100 shadow-sm dark:bg-espresso-800">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl bg-crema-200 text-espresso-900">
                    <Store className="size-5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-xl font-semibold">Vendor board</h3>
                    <p className="text-sm text-crema-300/80">
                      Dense and efficient, made for a tablet on the counter
                    </p>
                  </div>
                </div>
                <ul className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
                  {[
                    [Store, "Open or close the van"],
                    [MapPinned, "Set location by GPS or map click"],
                    [LayoutDashboard, "Live board: preparing, ready, collected"],
                    [ChefHat, "Per-order countdown to the deadline"],
                    [BadgePercent, "Late orders flagged automatically"],
                    [ScrollText, "Searchable order history"],
                  ].map(([Icon, text]) => {
                    const I = Icon as typeof Star;
                    return (
                      <li key={text as string} className="flex items-start gap-2.5">
                        <I className="mt-0.5 size-4 shrink-0 text-tomato-300" aria-hidden />
                        <span>{text as string}</span>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-auto pt-7">
                  <Link
                    href="/vendor"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-tomato-300 hover:underline"
                  >
                    Open the vendor board <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* The brief & what we built -------------------------------------- */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6" aria-labelledby="brief">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-5">
              <p className="text-sm font-semibold tracking-[0.16em] text-primary uppercase">
                The coursework
              </p>
              <h2 id="brief" className="text-3xl font-semibold sm:text-4xl">
                What the brief asked for, and what we shipped
              </h2>
              <p className="leading-relaxed text-muted-foreground">
                The brief imagined a business of roving vans selling coffee and snacks, and asked
                each team to build its web app across four milestones: a customer app to find a van,
                order and track it, and a vendor app to run the van and work through orders, all
                backed by a database and authentication, with extra credit for things like maps and
                ratings.
              </p>
              <p className="leading-relaxed text-muted-foreground">
                Our five-person team delivered both portals in Express, Handlebars and MongoDB, plus
                three bonus features: the nearest-van map, a community blog and order ratings. The
                revival keeps the original rules (the ranking maths, the 10-minute change window,
                the 15-minute promise and the order states) and ports them to TypeScript with tests
                that run the 2021 code side by side.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                {MENU.slice(0, 4).map((item) => (
                  <span
                    key={item.product}
                    className="inline-flex items-center gap-2 rounded-full border bg-card py-1 pr-3 pl-1 text-sm"
                  >
                    <SnackImage src={item.photo} alt="" size={28} />
                    {item.product}
                    <span className="tabular text-muted-foreground">{formatPrice(item.price)}</span>
                  </span>
                ))}
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-4 self-center sm:grid-cols-3">
              {FACTS.map((fact) => (
                <div key={fact.label} className="rounded-3xl border bg-card p-5 shadow-sm">
                  <dt className="text-sm text-muted-foreground">{fact.label}</dt>
                  <dd className="tabular mt-1 font-display text-3xl font-semibold text-brand">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* About ---------------------------------------------------------- */}
        <section
          id="about"
          className="scroll-mt-20 border-t bg-surface/70"
          aria-labelledby="about-title"
        >
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="min-w-0 space-y-5">
                <p className="text-sm font-semibold tracking-[0.16em] text-primary uppercase">
                  About this project
                </p>
                <h2 id="about-title" className="text-3xl font-semibold sm:text-4xl">
                  INFO30005 Web Information Technologies
                </h2>
                <p className="text-muted-foreground">
                  University of Melbourne · Semester 1, 2021 · Group 4399, tutorial T03.
                </p>
                <ul className="space-y-3">
                  {TEAM.map((member) => (
                    <li key={member.name} className="rounded-2xl border bg-card p-4">
                      <p className="font-semibold">
                        {member.name}
                        {"highlight" in member ? (
                          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-tomato-700 dark:text-tomato-300">
                            revival
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{member.role}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="min-w-0 space-y-6">
                <div
                  className="overflow-x-auto rounded-3xl border bg-card shadow-sm"
                  tabIndex={0}
                  role="region"
                  aria-label="Original stack vs revived stack (scrolls sideways on small screens)"
                >
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <caption className="px-5 pt-5 text-left font-display text-lg font-semibold">
                      Original stack vs revived stack
                    </caption>
                    <thead>
                      <tr className="border-b text-xs tracking-wide text-muted-foreground uppercase">
                        <th scope="col" className="px-5 py-3 font-semibold">
                          Layer
                        </th>
                        <th scope="col" className="px-5 py-3 font-semibold">
                          2021
                        </th>
                        <th scope="col" className="px-5 py-3 font-semibold">
                          2026
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {STACK.map(([layer, before, after]) => (
                        <tr key={layer} className="border-b last:border-0">
                          <th scope="row" className="px-5 py-3 align-top font-semibold">
                            {layer}
                          </th>
                          <td className="px-5 py-3 align-top text-muted-foreground">{before}</td>
                          <td className="px-5 py-3 align-top">{after}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="rounded-3xl border border-dashed p-5 text-sm leading-relaxed text-muted-foreground">
                  <p>
                    <strong className="text-foreground">Academic integrity.</strong> The original
                    2021 submission is preserved unchanged in the repository&apos;s{" "}
                    <a
                      className="font-medium text-foreground underline underline-offset-4"
                      href={COURSEWORK_URL}
                      target="_blank"
                      rel="noreferrer"
                    >
                      coursework folder
                    </a>{" "}
                    for reference, apart from redacted secrets. The assignment brief and course
                    materials are not reproduced here; the description above is a paraphrase.
                  </p>
                </div>
                <a
                  href={REPO_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border bg-card px-5 py-3 text-sm font-semibold shadow-sm transition-colors hover:bg-secondary"
                >
                  <GithubMark className="size-4" /> View the code on GitHub
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA ------------------------------------------------------ */}
        <section className="bg-espresso-900 text-crema-100 dark:bg-espresso-950">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl font-semibold">Fancy a flat white?</h2>
              <p className="mt-2 text-crema-300/90">
                The vans around Melbourne Uni are open. Jump in as a customer or behind the counter.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <DemoLoginButton
                role="customer"
                className="h-12 rounded-full bg-tomato-600 px-6 text-base font-semibold text-white hover:bg-tomato-700"
              >
                Order a coffee
              </DemoLoginButton>
              <DemoLoginButton
                role="vendor"
                variant="outline"
                className="h-12 rounded-full border-crema-300/40 bg-transparent px-6 text-base font-semibold text-crema-100 hover:bg-white/10 hover:text-white"
              >
                Run a van
              </DemoLoginButton>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
