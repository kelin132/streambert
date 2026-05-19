"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { searchContent, searchAnime, getImageUrl } from "@/lib/api";
import type { SearchResult, AnimeItem } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [animeResults, setAnimeResults] = useState<AnimeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "anime">("all");

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setAnimeResults([]);
      return;
    }

    setLoading(true);
    try {
      const [contentResults, animeRes] = await Promise.all([
        searchContent(searchQuery),
        searchAnime(searchQuery),
      ]);
      setResults(contentResults);
      setAnimeResults(animeRes);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      handleSearch(query);
    }, 300);
    return () => clearTimeout(debounce);
  }, [query, handleSearch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (!open) {
          // This would need to be handled by parent
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const displayResults = activeTab === "anime" ? animeResults : results;

  return (
    <div
      className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="fixed left-1/2 top-20 -translate-x-1/2 w-full max-w-2xl px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 p-4 border-b border-border">
            <Search className="w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search movies, series, anime..."
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-lg"
              autoFocus
            />
            {loading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab("all")}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === "all"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Movies & Series ({results.length})
            </button>
            <button
              onClick={() => setActiveTab("anime")}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === "anime"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Anime ({animeResults.length})
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {!query && (
              <div className="p-8 text-center text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Start typing to search...</p>
                <p className="text-sm mt-1">Press ESC to close</p>
              </div>
            )}

            {query && displayResults.length === 0 && !loading && (
              <div className="p-8 text-center text-muted-foreground">
                <p>No results found for &quot;{query}&quot;</p>
              </div>
            )}

            {displayResults.length > 0 && (
              <div className="p-2">
                {displayResults.map((item, index) => (
                  <Link
                    key={`${item.url}-${index}`}
                    href={`/watch?url=${encodeURIComponent(item.url)}&type=${activeTab === "anime" ? "anime" : "content"}`}
                    onClick={onClose}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="relative w-16 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <Image
                        src={getImageUrl(item.image)}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate">
                        {item.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {item.type || (activeTab === "anime" ? "Anime" : "Content")}
                        {item.year && ` - ${item.year}`}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
