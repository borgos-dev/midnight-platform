// Skeleton shown by Next.js while the profile's server component is
// fetching. Mirrors the real layout closely so there's no perceived shift
// when the real content swaps in.

export default function Loading() {
  return (
    <div className="mx-auto max-w-xl xl:max-w-6xl xl:px-8 pb-32 xl:pb-12 text-white">
      <div className="xl:grid xl:grid-cols-[1fr_320px] xl:gap-10 xl:pt-6">
        {/* Main column */}
        <main className="min-w-0">
          {/* Mobile header skeleton */}
          <div className="xl:hidden">
            <div className="flex items-center gap-4 p-5">
              <div className="h-20 w-20 rounded-full bg-white/8 animate-pulse" />
              <div className="space-y-2">
                <div className="h-5 w-40 rounded bg-white/8 animate-pulse" />
                <div className="h-3 w-24 rounded bg-white/5 animate-pulse" />
              </div>
            </div>
            <div className="px-5 pb-4 space-y-2">
              <div className="h-3 w-full rounded bg-white/5 animate-pulse" />
              <div className="h-3 w-3/4 rounded bg-white/5 animate-pulse" />
            </div>
          </div>

          {/* Tabs + gallery grid skeleton */}
          <div className="px-5">
            <div className="h-12 w-full border-b border-white/6 mb-5" />
            <div className="grid grid-cols-3 xl:grid-cols-4 gap-1 xl:gap-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square bg-white/5 animate-pulse"
                />
              ))}
            </div>
          </div>
        </main>

        {/* Desktop sidebar skeleton */}
        <aside className="hidden xl:block">
          <div className="sticky top-24 rounded-2xl border border-white/10 bg-white/3 p-6 space-y-5">
            <div className="flex flex-col items-center">
              <div className="h-28 w-28 rounded-full bg-white/10 animate-pulse" />
              <div className="mt-4 h-5 w-36 rounded bg-white/10 animate-pulse" />
              <div className="mt-2 h-3 w-24 rounded bg-white/5 animate-pulse" />
            </div>
            <div className="h-px bg-white/10" />
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-white/5 animate-pulse" />
              <div className="h-3 w-3/4 rounded bg-white/5 animate-pulse" />
            </div>
            <div className="h-px bg-white/10" />
            <div className="h-10 w-full rounded-xl bg-white/10 animate-pulse" />
          </div>
        </aside>
      </div>
    </div>
  );
}
