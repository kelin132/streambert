// Nkiri API Client
import type {
  ContentItem,
  ContentDetails,
  AnimeItem,
  AnimeEpisode,
  SearchResult,
  ResolvedDownload,
} from "./types";

const API_KEY = "Godszeal";
const BASE_URL = "https://nkiri-api-pi.vercel.app/api";

// Nkiri endpoints
const NKIRI_BASE = `${BASE_URL}/nkiri`;
const ANIME_BASE = `${BASE_URL}/animepahe`;

async function fetchApi<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });
    if (!response.ok) {
      console.error(`API Error: ${response.status}`);
      return null;
    }
    const json = await response.json();
    // Handle API responses that wrap data in a "data" property
    if (json && typeof json === 'object' && 'data' in json && Array.isArray(json.data)) {
      return json.data as T;
    }
    return json;
  } catch (error) {
    console.error("Fetch error:", error);
    return null;
  }
}

// ========== NKIRI API ==========

export async function getLatestShows(): Promise<ContentItem[]> {
  const data = await fetchApi<ContentItem[]>(
    `${NKIRI_BASE}/latest?apiKey=${API_KEY}`
  );
  return data || [];
}

export async function getPopularShows(): Promise<ContentItem[]> {
  const data = await fetchApi<ContentItem[]>(
    `${NKIRI_BASE}/popular?apiKey=${API_KEY}`
  );
  return data || [];
}

export async function getMovies(page: number = 1): Promise<ContentItem[]> {
  const data = await fetchApi<ContentItem[]>(
    `${NKIRI_BASE}/movies?page=${page}&apiKey=${API_KEY}`
  );
  return data || [];
}

export async function getTVSeries(page: number = 1): Promise<ContentItem[]> {
  const data = await fetchApi<ContentItem[]>(
    `${NKIRI_BASE}/series?page=${page}&apiKey=${API_KEY}`
  );
  return data || [];
}

export async function getCategory(
  category: string,
  page: number = 1
): Promise<ContentItem[]> {
  const data = await fetchApi<ContentItem[]>(
    `${NKIRI_BASE}/category?cat=${category}&page=${page}&apiKey=${API_KEY}`
  );
  return data || [];
}

export async function getContentDetails(
  contentUrl: string
): Promise<ContentDetails | null> {
  const encodedUrl = encodeURIComponent(contentUrl);
  const data = await fetchApi<ContentDetails>(
    `${NKIRI_BASE}/content?url=${encodedUrl}&apiKey=${API_KEY}`
  );
  return data;
}

export async function resolveDownloadLink(
  downloadUrl: string
): Promise<ResolvedDownload | null> {
  const encodedUrl = encodeURIComponent(downloadUrl);
  const data = await fetchApi<ResolvedDownload>(
    `${NKIRI_BASE}/resolve?url=${encodedUrl}&apiKey=${API_KEY}`
  );
  return data;
}

export async function searchContent(query: string): Promise<SearchResult[]> {
  const encodedQuery = encodeURIComponent(query);
  const data = await fetchApi<SearchResult[]>(
    `${NKIRI_BASE}/search?q=${encodedQuery}&apiKey=${API_KEY}`
  );
  return data || [];
}

// ========== ANIME API ==========

export async function getLatestAnime(): Promise<AnimeItem[]> {
  const data = await fetchApi<AnimeItem[]>(
    `${ANIME_BASE}/latest?apiKey=${API_KEY}`
  );
  return data || [];
}

export async function getTopAnime(page: number = 1): Promise<AnimeItem[]> {
  const data = await fetchApi<AnimeItem[]>(
    `${ANIME_BASE}/top?page=${page}&apiKey=${API_KEY}`
  );
  return data || [];
}

export async function getAnimeEpisodes(
  animeUrl: string
): Promise<AnimeEpisode[]> {
  const encodedUrl = encodeURIComponent(animeUrl);
  const data = await fetchApi<AnimeEpisode[]>(
    `${ANIME_BASE}/episodes?url=${encodedUrl}&apiKey=${API_KEY}`
  );
  return data || [];
}

export async function searchAnime(query: string): Promise<AnimeItem[]> {
  const encodedQuery = encodeURIComponent(query);
  const data = await fetchApi<AnimeItem[]>(
    `${ANIME_BASE}/search?q=${encodedQuery}&apiKey=${API_KEY}`
  );
  return data || [];
}

// Helper to extract image URL from content
export function getImageUrl(url: string | undefined): string {
  if (!url) return "/placeholder.jpg";
  if (url.startsWith("http")) return url;
  return `https:${url}`;
}

// Categories available
export const CATEGORIES = [
  { id: "international", label: "International" },
  { id: "nollywood", label: "Nollywood" },
  { id: "korean", label: "Korean" },
  { id: "indian", label: "Indian" },
  { id: "action", label: "Action" },
  { id: "comedy", label: "Comedy" },
  { id: "drama", label: "Drama" },
  { id: "thriller", label: "Thriller" },
  { id: "romance", label: "Romance" },
  { id: "horror", label: "Horror" },
];
