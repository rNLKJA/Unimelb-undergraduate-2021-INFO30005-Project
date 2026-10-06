import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Markdown } from "@/components/methods/markdown";
import { readDoc, withoutTitle } from "@/lib/content/docs";
import { REPO_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Model and data card",
  description:
    "Provenance, intended use, evaluation with intervals, failure modes and ethics for the demo data, the analytics and the experiment simulation.",
};

export default function ModelCardPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6 lg:py-12">
      <Link
        href="/methods"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> Methods &amp; decisions
      </Link>
      <header className="space-y-2">
        <p className="text-sm font-semibold tracking-[0.16em] text-primary uppercase">Card</p>
        <h1 className="text-3xl font-semibold sm:text-4xl">Model and data card</h1>
      </header>
      <article className="rounded-3xl border bg-card p-5 shadow-sm sm:p-8">
        <Markdown source={withoutTitle(readDoc("model-card.md"))} />
      </article>
      <p className="text-xs text-muted-foreground">
        Source:{" "}
        <a
          href={`${REPO_URL}/blob/main/docs/model-card.md`}
          target="_blank"
          rel="noreferrer"
          className="font-mono underline underline-offset-4"
        >
          docs/model-card.md
        </a>
      </p>
    </div>
  );
}
