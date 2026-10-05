/**
 * Renders the repository's markdown documents (decision records, model and
 * data card, AI use statement, privacy note) in the site's typography.
 * Server Component.
 */
import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { REPO_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

type HastNode = { type?: string; tagName?: string; value?: string; children?: HastNode[] };

const textOf = (node: HastNode | undefined): string =>
  !node
    ? ""
    : node.type === "text"
      ? (node.value ?? "")
      : (node.children ?? []).map(textOf).join("");

function headerCells(table: HastNode | undefined): HastNode[] {
  const firstRow = (node: HastNode | undefined): HastNode | undefined => {
    if (!node) return undefined;
    if (node.tagName === "tr") return node;
    for (const child of node.children ?? []) {
      const row = firstRow(child);
      if (row) return row;
    }
    return undefined;
  };
  return (firstRow(table)?.children ?? []).filter((c) => c.tagName === "th" || c.tagName === "td");
}

/** A distinct accessible name for a scrollable table: its column headings. */
function tableLabel(table: HastNode | undefined): string {
  const heads = headerCells(table)
    .map((c) => textOf(c).trim())
    .filter(Boolean);
  return heads.length ? `Table: ${heads.join(", ")}` : "Table";
}

/** Map links between docs to site routes; other repo-relative links go to GitHub. */
export function resolveDocHref(href: string): { href: string; external: boolean } {
  if (/^https?:\/\//.test(href)) return { href, external: true };
  if (href.startsWith("#") || href.startsWith("/")) return { href, external: false };
  const dr = href.match(/(DR-\d{3}-[\w-]+)\.md$/);
  if (dr) return { href: `/methods/decisions/${dr[1]}`, external: false };
  if (href.endsWith("model-card.md")) return { href: "/methods/model-card", external: false };
  if (href.endsWith("ai-use-statement.md")) return { href: "/methods#ai-use", external: false };
  if (href.endsWith("privacy-and-retention.md"))
    return { href: "/methods#privacy", external: false };
  return { href: `${REPO_URL}/blob/main/docs/${href.replace(/^\.\//, "")}`, external: true };
}

const components: Components = {
  h1: ({ children }) => <h2 className="mt-8 text-2xl font-semibold first:mt-0">{children}</h2>,
  h2: ({ children }) => (
    <h2 className="mt-8 text-xl font-semibold first:mt-0 sm:text-2xl">{children}</h2>
  ),
  h3: ({ children }) => <h3 className="mt-6 text-lg font-semibold">{children}</h3>,
  p: ({ children }) => <p className="mt-3 leading-relaxed text-foreground/90">{children}</p>,
  ul: ({ children }) => <ul className="mt-3 list-disc space-y-1.5 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="mt-3 list-decimal space-y-1.5 pl-5">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed text-foreground/90">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  a: ({ href = "", children }) => {
    const r = resolveDocHref(href);
    return r.external ? (
      <a href={r.href} target="_blank" rel="noreferrer" className="underline underline-offset-4">
        {children}
      </a>
    ) : (
      <Link href={r.href} className="underline underline-offset-4">
        {children}
      </Link>
    );
  },
  code: ({ className, children }) =>
    className ? (
      <code className={cn("font-mono text-xs", className)}>{children}</code>
    ) : (
      <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] [overflow-wrap:anywhere]">
        {children}
      </code>
    ),
  pre: ({ children }) => (
    <pre className="mt-3 overflow-x-auto rounded-xl border bg-muted/60 p-3 text-xs">{children}</pre>
  ),
  table: ({ node, children }) => (
    <div
      role="region"
      tabIndex={0}
      aria-label={tableLabel(node as HastNode)}
      className="mt-4 overflow-x-auto rounded-xl border"
    >
      <table
        className={cn(
          "w-full text-sm",
          headerCells(node as HastNode).length > 2 && "min-w-[560px]",
        )}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-muted/60 text-left text-xs text-muted-foreground">{children}</thead>
  ),
  tr: ({ children }) => <tr className="border-b border-border/60 last:border-0">{children}</tr>,
  // Inline code elsewhere may break anywhere so long paths never overflow a
  // line, but inside a table that would shrink the column until identifiers
  // split mid-word ("ai_audi|t_log"). Cells size to whole words instead; the
  // wrapper scrolls horizontally if the table gets too wide.
  th: ({ children }) => (
    <th className="px-3 py-2 font-medium [&_code]:[overflow-wrap:normal]">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 align-top [&_code]:[overflow-wrap:normal]">{children}</td>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mt-3 border-l-2 border-primary/60 pl-4 text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-8" />,
};

/** Headings one level lower, for documents embedded under a page's own h2. */
const nested: Components = {
  ...components,
  h1: ({ children }) => <h3 className="mt-6 text-xl font-semibold first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mt-6 text-lg font-semibold first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-5 font-semibold">{children}</h4>,
};

export function Markdown({
  source,
  className,
  nestedHeadings = false,
}: {
  source: string;
  className?: string;
  /** Render "##" as h3 (the document sits under a page section's h2). */
  nestedHeadings?: boolean;
}) {
  return (
    <div className={cn("max-w-3xl", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={nestedHeadings ? nested : components}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
