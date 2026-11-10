import { Skeleton } from "@/components/ui/card";

export default function Loading() {
  return (
    <div role="status" aria-label="Yüklənir" className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
      <Skeleton className="h-10 w-72" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-96 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
