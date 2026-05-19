// API Types for Nkiri API

export interface ContentItem {
  title: string;
  url: string;
  image: string;
  type?: string;
  year?: string;
  rating?: string;
  description?: string;
}

export interface ContentDetails {
  title: string;
  image: string;
  description: string;
  year?: string;
  rating?: string;
  genre?: string[];
  cast?: string[];
  director?: string;
  duration?: string;
  downloadLinks?: DownloadLink[];
  episodes?: Episode[];
  seasons?: Season[];
}

export interface DownloadLink {
  quality: string;
  url: string;
  size?: string;
}

export interface Episode {
  title: string;
  url: string;
  episode: number;
  season?: number;
}

export interface Season {
  season: number;
  episodes: Episode[];
}

export interface AnimeItem {
  title: string;
  url: string;
  image: string;
  type?: string;
  episodes?: number;
  status?: string;
  score?: number;
}

export interface AnimeEpisode {
  title: string;
  url: string;
  episode: number;
}

export interface ResolvedDownload {
  url: string;
  filename?: string;
}

export interface SearchResult {
  title: string;
  url: string;
  image: string;
  type?: string;
  year?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
