import { Suspense } from "react";
import { getLatestAnime, getTopAnime } from "@/lib/api";
import { MediaCard } from "@/components/media-card";
import { ContentRow } from "@/components/content-row";
import { Sparkles } from "lucide-react";

async function AnimeContent() {
  const [latestAnime, topAnime] = await Promise.all([
    getLatestAnime(),
    getTopAnime(1),
  ]);

  return (
    <div className="min-h-screen pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Anime</h1>
            <p className="text-muted-foreground">
              Explore the latest and top-rated anime
            </p>
          </div>
        </div>

        {/* Latest Anime */}
        <ContentRow
          title="Latest Anime"
          items={latestAnime}
          type="anime"
        />

        {/* Top Rated Anime */}
        <section className="mt-8">
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4">
            Top Rated
          </h2>
          {topAnime.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {topAnime.map((anime, index) => (
                <MediaCard key={`${anime.url}-${index}`} item={anime} type="anime" />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Sparkles className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No anime found</p>
            </div>
          )}
        </section>
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
        <div className="h-8 w-48 skeleton rounded mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] skeleton rounded-lg" />
          ))}
        </div>
        <div className="h-8 w-48 skeleton rounded mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] skeleton rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AnimePage() {
  return (
    <Suspense fallback={<LoadingGrid />}>
      <AnimeContent />
    </Suspense>
  );
}
