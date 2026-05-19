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

  // Ensure all responses are arrays
  const latestItems = Array.isArray(latest) ? latest : [];
  const popularItems = Array.isArray(popular) ? popular : [];
  const moviesItems = Array.isArray(movies) ? movies : [];
  const seriesItems = Array.isArray(series) ? series : [];
  const latestAnimeItems = Array.isArray(latestAnime) ? latestAnime : [];
  const topAnimeItems = Array.isArray(topAnime) ? topAnime : [];

  const heroItem = popularItems[0] || latestItems[0];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      {heroItem && <HeroSection item={heroItem} />}

      {/* Content Sections */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <ContentRow
          title="Latest Releases"
          items={latestItems}
          viewAllHref="/browse?category=latest"
        />

        <ContentRow
          title="Popular Now"
          items={popularItems}
          viewAllHref="/browse?category=popular"
        />

        <ContentRow
          title="Movies"
          items={moviesItems}
          viewAllHref="/movies"
        />

        <ContentRow
          title="TV Series"
          items={seriesItems}
          viewAllHref="/series"
        />

        <ContentRow
          title="Latest Anime"
          items={latestAnimeItems}
          type="anime"
          viewAllHref="/anime"
        />

        <ContentRow
          title="Top Rated Anime"
          items={topAnimeItems}
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
