"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Star,
  Film,
  Tv,
  Loader2,
} from "lucide-react";
import { getContentDetails, getAnimeEpisodes, getImageUrl } from "@/lib/api";
import type { ContentDetails, AnimeEpisode } from "@/lib/types";
import { VideoPlayer, EpisodeSelector } from "@/components/video-player";
import { DownloadButton } from "@/components/download-button";

function WatchPageContent() {
  const searchParams = useSearchParams();
  const contentUrl = searchParams.get("url");
  const contentType = searchParams.get("type") || "content";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<ContentDetails | null>(null);
  const [episodes, setEpisodes] = useState<AnimeEpisode[]>([]);
  const [currentEpisode, setCurrentEpisode] = useState<AnimeEpisode | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  useEffect(() => {
    async function fetchContent() {
      if (!contentUrl) {
        setError("No content URL provided");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        if (contentType === "anime") {
          // Fetch anime episodes
          const animeEpisodes = await getAnimeEpisodes(contentUrl);
          setEpisodes(animeEpisodes);
          if (animeEpisodes.length > 0) {
            setCurrentEpisode(animeEpisodes[0]);
          }
          // Create a basic details object for anime
          setDetails({
            title: decodeURIComponent(contentUrl).split("/").pop()?.replace(/-/g, " ") || "Anime",
            image: "",
            description: "Loading anime content...",
          });
        } else {
          // Fetch content details for movies/series
          const contentDetails = await getContentDetails(contentUrl);
          if (contentDetails) {
            setDetails(contentDetails);
            // Check for episodes in the response
            if (contentDetails.episodes && contentDetails.episodes.length > 0) {
              const mappedEpisodes = contentDetails.episodes.map((ep, idx) => ({
                title: ep.title,
                url: ep.url,
                episode: ep.episode || idx + 1,
                season: ep.season || 1,
              }));
              setEpisodes(mappedEpisodes);
              setCurrentEpisode(mappedEpisodes[0]);
            }
          } else {
            setError("Failed to load content details");
          }
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to load content");
      } finally {
        setLoading(false);
      }
    }

    fetchContent();
  }, [contentUrl, contentType]);

  const handleEpisodeSelect = (episode: AnimeEpisode) => {
    setCurrentEpisode(episode);
    // You could resolve the episode URL here for streaming
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading content...</p>
        </div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-500 text-lg">{error || "Content not found"}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      {/* Back button */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Video Player Section */}
          <div className="lg:col-span-2 space-y-6">
            <VideoPlayer
              streamUrl={streamUrl || currentEpisode?.url}
              title={details.title}
            />

            {/* Episode Selector */}
            {episodes.length > 0 && (
              <EpisodeSelector
                episodes={episodes}
                currentEpisode={currentEpisode?.episode || 1}
                onSelectEpisode={handleEpisodeSelect}
              />
            )}
          </div>

          {/* Details Sidebar */}
          <div className="space-y-6">
            {/* Poster & Info */}
            <div className="bg-card rounded-xl border border-border p-6 space-y-4">
              {details.image && (
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden">
                  <Image
                    src={getImageUrl(details.image)}
                    alt={details.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 33vw"
                  />
                </div>
              )}

              <div className="space-y-3">
                <h1 className="text-2xl font-bold text-foreground">
                  {details.title}
                </h1>

                {/* Meta info */}
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {details.year && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {details.year}
                    </span>
                  )}
                  {details.duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {details.duration}
                    </span>
                  )}
                  {details.rating && (
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      {details.rating}
                    </span>
                  )}
                </div>

                {/* Type badge */}
                <div className="flex items-center gap-2">
                  {contentType === "anime" ? (
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                      Anime
                    </span>
                  ) : episodes.length > 0 ? (
                    <span className="flex items-center gap-1 px-3 py-1 bg-muted rounded-full text-sm">
                      <Tv className="w-4 h-4" />
                      Series
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-3 py-1 bg-muted rounded-full text-sm">
                      <Film className="w-4 h-4" />
                      Movie
                    </span>
                  )}
                </div>

                {/* Genres */}
                {details.genre && details.genre.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {details.genre.map((g) => (
                      <span
                        key={g}
                        className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                )}

                {/* Description */}
                {details.description && (
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {details.description}
                  </p>
                )}

                {/* Cast */}
                {details.cast && details.cast.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-1">
                      Cast
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {details.cast.slice(0, 5).join(", ")}
                    </p>
                  </div>
                )}

                {/* Director */}
                {details.director && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-1">
                      Director
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {details.director}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Download Section */}
            {details.downloadLinks && details.downloadLinks.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-6">
                <DownloadButton links={details.downloadLinks} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WatchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      }
    >
      <WatchPageContent />
    </Suspense>
  );
}
