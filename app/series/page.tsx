import { Suspense } from "react";
import { getTVSeries } from "@/lib/api";
import { MediaCard } from "@/components/media-card";
import { Tv } from "lucide-react";

async function SeriesContent() {
  const series = await getTVSeries(1);

  return (
    <div className="min-h-screen pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Tv className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">TV Series</h1>
            <p className="text-muted-foreground">
              Browse our collection of TV series
            </p>
          </div>
        </div>

        {/* Series Grid */}
        {series.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {series.map((show, index) => (
              <MediaCard key={`${show.url}-${index}`} item={show} type="content" />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Tv className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No series found</p>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="min-h-screen pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-14 h-14 skeleton rounded-xl" />
          <div>
            <div className="h-8 w-32 skeleton rounded mb-2" />
            <div className="h-5 w-48 skeleton rounded" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] skeleton rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SeriesPage() {
  return (
    <Suspense fallback={<LoadingGrid />}>
      <SeriesContent />
    </Suspense>
  );
}
