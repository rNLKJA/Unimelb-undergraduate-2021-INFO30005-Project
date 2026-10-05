import Link from "next/link";
import { VanMark } from "@/components/brand/van-mark";
import { COURSEWORK_URL, REPO_URL } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t bg-surface/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <VanMark className="h-6 w-auto" />
            <span className="font-display text-lg font-semibold text-brand">Snacks in a Van</span>
          </div>
          <p className="max-w-sm text-sm text-muted-foreground">
            INFO30005 Web Information Technologies group project (Group 4399, University of
            Melbourne, Semester 1 2021), revived in 2026 as a Next.js app. Demo data only: every
            customer, van and order here is synthetic.
          </p>
        </div>
        <nav aria-label="Demo" className="space-y-2 text-sm">
          <p className="font-semibold">Try it</p>
          <ul className="space-y-1.5 text-muted-foreground">
            <li>
              <Link className="hover:text-foreground hover:underline" href="/customer">
                Customer app
              </Link>
            </li>
            <li>
              <Link className="hover:text-foreground hover:underline" href="/vendor">
                Vendor board
              </Link>
            </li>
            <li>
              <Link className="hover:text-foreground hover:underline" href="/customer/community">
                Community
              </Link>
            </li>
            <li>
              <Link className="hover:text-foreground hover:underline" href="/admin/records">
                Records
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Project" className="space-y-2 text-sm">
          <p className="font-semibold">Project</p>
          <ul className="space-y-1.5 text-muted-foreground">
            <li>
              <a
                className="hover:text-foreground hover:underline"
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
              >
                Source on GitHub
              </a>
            </li>
            <li>
              <a
                className="hover:text-foreground hover:underline"
                href={COURSEWORK_URL}
                target="_blank"
                rel="noreferrer"
              >
                Original 2021 submission
              </a>
            </li>
            <li>
              <Link className="hover:text-foreground hover:underline" href="/#about">
                About &amp; credits
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted-foreground sm:px-6">
          Map data © OpenStreetMap contributors · tiles by OpenFreeMap · geocoding by Photon. Snack
          illustrations drawn for this project.
        </p>
      </div>
    </footer>
  );
}
