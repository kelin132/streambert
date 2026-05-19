"use client";

import { useState } from "react";
import { Play, Loader2 } from "lucide-react";

interface VideoPlayerProps {
  streamUrl?: string;
  embedUrl?: string;
  title: string;
}

// Streaming sources for movies/series
const STREAM_SOURCES = [
  {
    id: "videasy",
    name: "Videasy",
    getUrl: (tmdbId: string, type: "movie" | "tv", season?: number, episode?: number) =>
      type === "movie"
        ? `https://player.videasy.net/movie/${tmdbId}`
        : `https://player.videasy.net/tv/${tmdbId}/${season}/${episode}`,
  },
  {
    id: "vidsrc",
    name: "VidSrc",
    getUrl: (tmdbId: string, type: "movie" | "tv", season?: number, episode?: number) =>
      type === "movie"
        ? `https://vidsrc.to/embed/movie/${tmdbId}`
        : `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`,
  },
  {
    id: "2embed",
    name: "2Embed",
    getUrl: (tmdbId: string, type: "movie" | "tv", season?: number, episode?: number) =>
      type === "movie"
        ? `https://www.2embed.online/embed/movie/${tmdbId}`
        : `https://www.2embed.online/embed/tv/${tmdbId}/${season}/${episode}`,
  },
];

export function VideoPlayer({ streamUrl, embedUrl, title }: VideoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentSource, setCurrentSource] = useState(0);

  const handleIframeLoad = () => {
    setIsLoading(false);
    setError(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setError(true);
  };

  // Use provided URL or show placeholder
  const videoUrl = streamUrl || embedUrl;

  if (!videoUrl) {
    return (
      <div className="video-container bg-card rounded-xl overflow-hidden">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-muted-foreground">
          <Play className="w-16 h-16" />
          <p className="text-lg">No streaming source available</p>
          <p className="text-sm">Try downloading the content instead</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="video-container bg-card rounded-xl overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-card">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading player...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-card">
            <div className="flex flex-col items-center gap-3 text-center p-4">
              <p className="text-red-500">Failed to load video</p>
              <p className="text-sm text-muted-foreground">
                Try a different source or download the content
              </p>
            </div>
          </div>
        )}
        <iframe
          src={videoUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className={`absolute inset-0 w-full h-full ${isLoading ? "invisible" : "visible"}`}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Source switcher info */}
      <p className="text-sm text-muted-foreground text-center">
        If video doesn&apos;t load, try refreshing or use the download option
      </p>
    </div>
  );
}

// Episode selector for TV series
interface Episode {
  title: string;
  url: string;
  episode: number;
  season?: number;
}

interface EpisodeSelectorProps {
  episodes: Episode[];
  currentEpisode: number;
  onSelectEpisode: (episode: Episode) => void;
}

export function EpisodeSelector({
  episodes,
  currentEpisode,
  onSelectEpisode,
}: EpisodeSelectorProps) {
  if (!episodes || episodes.length === 0) return null;

  // Group episodes by season if available
  const groupedBySeason = episodes.reduce((acc, ep) => {
    const season = ep.season || 1;
    if (!acc[season]) acc[season] = [];
    acc[season].push(ep);
    return acc;
  }, {} as Record<number, Episode[]>);

  const seasons = Object.keys(groupedBySeason).map(Number).sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Episodes</h3>
      {seasons.map((season) => (
        <div key={season} className="space-y-2">
          {seasons.length > 1 && (
            <h4 className="text-sm font-medium text-muted-foreground">
              Season {season}
            </h4>
          )}
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {groupedBySeason[season].map((ep) => (
              <button
                key={`s${ep.season}e${ep.episode}`}
                onClick={() => onSelectEpisode(ep)}
                className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                  currentEpisode === ep.episode
                    ? "bg-primary text-primary-foreground"
                    : "bg-card hover:bg-muted text-foreground border border-border"
                }`}
              >
                {ep.episode}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
