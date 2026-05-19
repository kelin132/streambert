import { Suspense } from "react";
import {
  getLatestShows,
  getPopularShows,
  getMovies,
  getTVSeries,
  getLatestAnime,
  getTopAnime,
} from "@/lib/api";
import { HeroSection } from "@/components/hero-section";
import { ContentRow } from "@/components/content-row";
import { LoadingSkeleton } from "@/components/loading-skeleton";

async function HomeContent() {
  const [latest, popular, movies, series, latestAnime, topAnime] =
    await Promise.all([
      getLatestShows(),
      getPopularShows(),
      getMovies(),
      getTVSeries(),
      getLatestAnime(),
      getTopAnime(),
    ]);

  const heroItem = popular[0] || latest[0];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      {heroItem && <HeroSection item={heroItem} />}

      {/* Content Sections */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <ContentRow
          title="Latest Releases"
          items={latest}
          viewAllHref="/browse?category=latest"
        />

        <ContentRow
          title="Popular Now"
          items={popular}
          viewAllHref="/browse?category=popular"
        />

        <ContentRow
          title="Movies"
          items={movies}
          viewAllHref="/movies"
        />

        <ContentRow
          title="TV Series"
          items={series}
          viewAllHref="/series"
        />

        <ContentRow
          title="Latest Anime"
          items={latestAnime}
          type="anime"
          viewAllHref="/anime"
        />

        <ContentRow
          title="Top Rated Anime"
          items={topAnime}
          type="anime"
          viewAllHref="/anime?sort=top"
        />
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}
