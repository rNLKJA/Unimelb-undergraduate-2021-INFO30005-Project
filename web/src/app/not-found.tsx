import Link from "next/link";
import { VanMark } from "@/components/brand/van-mark";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="bg-grain grid flex-1 place-items-center px-4 py-24">
      <div className="max-w-md text-center">
        <VanMark className="mx-auto h-16 w-auto animate-float" />
        <p className="mt-6 font-mono text-sm text-muted-foreground">404</p>
        <h1 className="mt-1 text-3xl font-semibold">This van has driven off</h1>
        <p className="mt-2 text-muted-foreground">
          The page you were after isn&apos;t parked here. It may have moved, or the link is out of
          date.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild className="h-11 rounded-full px-5">
            <Link href="/customer">Find an open van</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 rounded-full px-5">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
