export function LoadingSkeleton() {
  return (
    <div className="min-h-screen">
      {/* Hero Skeleton */}
      <div className="relative h-[70vh] min-h-[500px] mb-8 -mt-16">
        <div className="absolute inset-0 skeleton" />
        <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-end pb-16">
          <div className="max-w-2xl">
            <div className="h-8 w-24 skeleton rounded mb-4" />
            <div className="h-12 w-96 skeleton rounded mb-4" />
            <div className="h-6 w-full skeleton rounded mb-2" />
            <div className="h-6 w-3/4 skeleton rounded mb-6" />
            <div className="flex gap-4">
              <div className="h-12 w-32 skeleton rounded-lg" />
              <div className="h-12 w-32 skeleton rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Content Row Skeletons */}
      {[1, 2, 3].map((row) => (
        <section key={row} className="mb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="h-8 w-48 skeleton rounded mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((card) => (
              <div key={card} className="aspect-[2/3] skeleton rounded-lg" />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
