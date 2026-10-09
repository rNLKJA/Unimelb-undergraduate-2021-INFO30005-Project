import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// Self-hosted latin subsets from @fontsource-variable 5.3.0 and @fontsource
// 5.3.0 (DM Mono is static only). OFL, licences in ./fonts, so the build never
// depends on fetching Google Fonts.
const display = localFont({
  src: "./fonts/fredoka-latin-wght-normal.woff2",
  variable: "--font-display-face",
  weight: "300 700",
  style: "normal",
  display: "swap",
});

const body = localFont({
  src: "./fonts/dm-sans-latin-wght-normal.woff2",
  variable: "--font-body",
  weight: "100 1000",
  style: "normal",
  display: "swap",
});

const mono = localFont({
  src: [
    { path: "./fonts/dm-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/dm-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-code",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
  : process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
    : new URL("http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "Snacks in a Van: order coffee from the nearest van",
    template: "%s · Snacks in a Van",
  },
  description:
    "A two-portal food-ordering app for roving coffee vans: customers find the nearest van and order ahead, vendors run a live order board. INFO30005 group project (University of Melbourne, 2021), revived with Next.js.",
  applicationName: "Snacks in a Van",
  authors: [{ name: "Sunchuangyu (Rin) Huang" }, { name: "Group 4399, INFO30005 2021" }],
  keywords: ["Snacks in a Van", "INFO30005", "University of Melbourne", "Next.js", "food ordering"],
  openGraph: {
    type: "website",
    siteName: "Snacks in a Van",
    title: "Snacks in a Van",
    description:
      "Find the nearest coffee van, order ahead and track it live. A 2021 uni project, revived.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fffaf2" },
    { media: "(prefers-color-scheme: dark)", color: "#140d09" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-AU"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only z-[100] rounded-full bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delayDuration={200}>
            {children}
            <Toaster position="top-center" richColors closeButton />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
