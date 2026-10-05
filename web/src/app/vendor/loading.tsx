import { Skeleton } from "@/components/ui/skeleton";

export default function VendorLoading() {
  return (
    <div
      className="mx-auto max-w-[1400px] space-y-4 px-3 py-5 sm:px-5"
      aria-busy="true"
      aria-label="Loading"
    >
      <Skeleton className="h-8 w-48 rounded-lg" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-80 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
