/** Route-level loading skeleton shown during navigation between filtered views. */
export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:py-8">
      <div className="mb-6 space-y-2">
        <div className="bg-muted h-7 w-56 animate-pulse rounded" />
        <div className="bg-muted h-4 w-80 animate-pulse rounded" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-muted h-[92px] animate-pulse rounded-xl" />
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="bg-muted h-72 animate-pulse rounded-xl lg:col-span-2" />
        <div className="bg-muted h-72 animate-pulse rounded-xl" />
      </div>
    </main>
  );
}
