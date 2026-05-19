// ═══════════════════════════════════════════════════════════════════════════
// Nkiri & AnimePahe API Client
// ═══════════════════════════════════════════════════════════════════════════

const API_BASE = "https://nkiri-api-pi.vercel.app/api";
const API_KEY = "Godszeal";

// ── In-memory cache (session-scoped, cleared on page reload) ─────────────────
const _cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ── Request queue (max 4 concurrent fetches) ─────────────────────────────────
let _inflight = 0;
const MAX_INFLIGHT = 4;
const _waiters = [];

function _acquireSlot() {
  if (_inflight < MAX_INFLIGHT) {
    _inflight++;
    return Promise.resolve();
  }
  return new Promise((resolve) => _waiters.push(resolve));
}

function _releaseSlot() {
  _inflight--;
  if (_waiters.length > 0) {
    _inflight++;
    _waiters.shift()();
  }
}

// ── Core fetch helper ────────────────────────────────────────────────────────
async function apiFetch(endpoint, params = {}) {
  const url = new URL(`${API_BASE}${endpoint}`);
  url.searchParams.set("apiKey", API_KEY);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  });

  const cacheKey = url.toString();
  const cached = _cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  await _acquireSlot();

  try {
    const res = await fetch(url.toString());
    _releaseSlot();

    if (!res.ok) {
      throw new Error(`API Error: ${res.status}`);
    }

    const data = await res.json();
    _cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL });

    // Evict stale entries to prevent unbounded memory growth
    if (_cache.size > 100) {
      const now = Date.now();
      for (const [k, v] of _cache) {
        if (now >= v.expiresAt) _cache.delete(k);
      }
    }

    return data;
  } catch (err) {
    _releaseSlot();
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Nkiri API Endpoints
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch latest shows
 * @returns {Promise<{success: boolean, data: Array}>}
 */
export async function fetchLatestShows() {
  return apiFetch("/nkiri/latest");
}

/**
 * Fetch popular shows
 * @returns {Promise<{success: boolean, data: Array}>}
 */
export async function fetchPopularShows() {
  return apiFetch("/nkiri/popular");
}

/**
 * Fetch movies with pagination
 * @param {number} page - Page number (default: 1)
 * @returns {Promise<{success: boolean, data: Array}>}
 */
export async function fetchMovies(page = 1) {
  return apiFetch("/nkiri/movies", { page });
}

/**
 * Fetch TV series with pagination
 * @param {number} page - Page number (default: 1)
 * @returns {Promise<{success: boolean, data: Array}>}
 */
export async function fetchTVSeries(page = 1) {
  return apiFetch("/nkiri/series", { page });
}

/**
 * Fetch content by category
 * @param {string} category - Category name (e.g., "international", "korean", etc.)
 * @param {number} page - Page number (default: 1)
 * @returns {Promise<{success: boolean, data: Array}>}
 */
export async function fetchCategory(category, page = 1) {
  return apiFetch("/nkiri/category", { cat: category, page });
}

/**
 * Fetch content details
 * @param {string} contentUrl - The full URL of the content page
 * @returns {Promise<{success: boolean, data: Object}>}
 */
export async function fetchContentDetails(contentUrl) {
  return apiFetch("/nkiri/content", { url: contentUrl });
}

/**
 * Resolve download URL to get direct link
 * @param {string} downloadUrl - The download page URL to resolve
 * @returns {Promise<{success: boolean, data: {url: string}}>}
 */
export async function resolveDownloadUrl(downloadUrl) {
  return apiFetch("/nkiri/resolve", { url: downloadUrl });
}

/**
 * Search for content
 * @param {string} query - Search query
 * @returns {Promise<{success: boolean, data: Array}>}
 */
export async function searchContent(query) {
  return apiFetch("/nkiri/search", { q: query });
}

// ═══════════════════════════════════════════════════════════════════════════
// AnimePahe API Endpoints
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch latest anime
 * @returns {Promise<{success: boolean, data: Array}>}
 */
export async function fetchLatestAnime() {
  return apiFetch("/animepahe/latest");
}

/**
 * Fetch top rated anime with pagination
 * @param {number} page - Page number (default: 1)
 * @returns {Promise<{success: boolean, data: Array}>}
 */
export async function fetchTopAnime(page = 1) {
  return apiFetch("/animepahe/top", { page });
}

/**
 * Fetch anime episode list
 * @param {string} animeUrl - The anime page URL
 * @returns {Promise<{success: boolean, data: Array}>}
 */
export async function fetchAnimeEpisodes(animeUrl) {
  return apiFetch("/animepahe/episodes", { url: animeUrl });
}

/**
 * Search for anime
 * @param {string} query - Search query
 * @returns {Promise<{success: boolean, data: Array}>}
 */
export async function searchAnime(query) {
  return apiFetch("/animepahe/search", { q: query });
}

// ═══════════════════════════════════════════════════════════════════════════
// Download Helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Download a file in-app using fetch + blob
 * @param {string} url - The direct download URL
 * @param {string} filename - The filename to save as
 * @param {Function} onProgress - Progress callback (0-100)
 * @returns {Promise<void>}
 */
export async function downloadInApp(url, filename, onProgress) {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  const contentLength = response.headers.get("content-length");
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  
  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    chunks.push(value);
    received += value.length;
    
    if (total && onProgress) {
      onProgress(Math.round((received / total) * 100));
    }
  }

  const blob = new Blob(chunks);
  const blobUrl = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

// ═══════════════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a unique ID from a URL (for use as storage key)
 * @param {string} url - Content URL
 * @returns {string}
 */
export function urlToId(url) {
  return btoa(url).replace(/[/+=]/g, "_").slice(0, 32);
}

/**
 * Get image URL - returns the URL as-is since Nkiri provides full URLs
 * @param {string} imageUrl - Image URL from API
 * @returns {string|null}
 */
export function imgUrl(imageUrl) {
  return imageUrl || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Player Sources (for streaming)
// ═══════════════════════════════════════════════════════════════════════════

export const PLAYER_SOURCES = [
  {
    id: "direct",
    label: "Direct Stream",
    tag: null,
    note: null,
    supportsProgress: true,
  },
];

export const getSourceUrl = (sourceId, directUrl) => {
  return directUrl;
};

export const sourceSupportsProgress = (sourceId) => true;
export const sourceProgressViaFrames = (sourceId) => false;
export const sourceIsAsync = (sourceId) => false;

export const NEEDS_INTERCEPT = [];

// Default sources
export const ANIME_DEFAULT_SOURCE = "direct";
export const NON_ANIME_DEFAULT_SOURCE = "direct";

// Clear caches utility
export function clearApiCache() {
  _cache.clear();
}
