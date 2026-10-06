import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/methods/markdown";
import { listDecisions, readDoc, withoutTitle } from "@/lib/content/docs";
import { REPO_URL } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return listDecisions().map((d) => ({ slug: d.slug }));
}

export async function generateMetadata(
  props: PageProps<"/methods/decisions/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const d = listDecisions().find((x) => x.slug === slug);
  return d
    ? { title: `${d.id}: ${d.title}`, description: `Decision record ${d.id}: ${d.title}.` }
    : {};
}

export default async function DecisionPage(props: PageProps<"/methods/decisions/[slug]">) {
  const { slug } = await props.params;
  const all = listDecisions();
  const index = all.findIndex((x) => x.slug === slug);
  if (index < 0) notFound();
  const d = all[index];
  const prev = all[index - 1];
  const next = all[index + 1];
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6 lg:py-12">
      <Link
        href="/methods#decisions"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> Methods &amp; decisions
      </Link>
      <header className="space-y-2">
        <p className="text-sm font-semibold tracking-[0.16em] text-primary uppercase">
          Decision record · {d.id}
        </p>
        <h1 className="text-3xl font-semibold sm:text-4xl">{d.title}</h1>
      </header>
      <article className="rounded-3xl border bg-card p-5 shadow-sm sm:p-8">
        <Markdown source={withoutTitle(readDoc(`decisions/${slug}.md`))} />
      </article>
      <nav
        aria-label="Other decision records"
        className="flex flex-wrap justify-between gap-3 text-sm"
      >
        {prev ? (
          <Link href={`/methods/decisions/${prev.slug}`} className="underline underline-offset-4">
            ← {prev.id}: {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/methods/decisions/${next.slug}`} className="underline underline-offset-4">
            {next.id}: {next.title} →
          </Link>
        ) : null}
      </nav>
      <p className="text-xs text-muted-foreground">
        Source:{" "}
        <a
          href={`${REPO_URL}/blob/main/docs/decisions/${slug}.md`}
          target="_blank"
          rel="noreferrer"
          className="font-mono underline underline-offset-4"
        >
          docs/decisions/{slug}.md
        </a>
        . Past records are never edited; a later record supersedes them.
      </p>
    </div>
  );
}
