import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div
      className="mx-auto grid max-w-[1400px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[240px_1fr]"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-9 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[480px] rounded-2xl" />
    </div>
  );
}
