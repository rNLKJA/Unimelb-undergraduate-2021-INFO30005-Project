import { Skeleton } from "@/components/ui/skeleton";

export default function CustomerLoading() {
  return (
    <div
      className="mx-auto max-w-5xl space-y-4 px-4 py-8 sm:px-6"
      aria-busy="true"
      aria-label="Loading"
    >
      <Skeleton className="h-9 w-56 rounded-xl" />
      <Skeleton className="h-4 w-80 rounded-lg" />
      <div className="grid gap-4 pt-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
