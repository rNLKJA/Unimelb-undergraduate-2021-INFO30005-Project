"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { VanMark } from "@/components/brand/van-mark";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="grid flex-1 place-items-center px-4 py-24">
      <div className="max-w-md text-center">
        <VanMark className="mx-auto h-14 w-auto -rotate-6 opacity-80" />
        <h1 className="mt-6 text-3xl font-semibold">Something spilled</h1>
        <p className="mt-2 text-muted-foreground">
          We hit a snag loading this page. It&apos;s usually temporary, so give it another go.
        </p>
        {error.digest ? (
          <p className="mt-2 font-mono text-xs text-muted-foreground">Ref: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={reset} className="h-11 rounded-full px-5">
            <RotateCcw aria-hidden /> Try again
          </Button>
          <Button asChild variant="outline" className="h-11 rounded-full px-5">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
