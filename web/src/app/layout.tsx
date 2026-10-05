import type { Metadata, Viewport } from "next";
import { DM_Mono, DM_Sans, Fredoka } from "next/font/google";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const display = Fredoka({
  variable: "--font-display-face",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
});

const body = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
});

const mono = DM_Mono({
  variable: "--font-code",
  subsets: ["latin"],
  weight: ["400", "500"],
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
