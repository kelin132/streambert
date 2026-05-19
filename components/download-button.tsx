"use client";

import { useState } from "react";
import { Download, ExternalLink, Loader2, CheckCircle } from "lucide-react";
import { resolveDownloadLink } from "@/lib/api";

interface DownloadLink {
  quality: string;
  url: string;
  size?: string;
}

interface DownloadButtonProps {
  links: DownloadLink[];
}

export function DownloadButton({ links }: DownloadButtonProps) {
  const [resolving, setResolving] = useState<string | null>(null);
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async (link: DownloadLink) => {
    if (resolvedUrls[link.url]) {
      window.open(resolvedUrls[link.url], "_blank");
      return;
    }

    setResolving(link.url);
    setError(null);

    try {
      const resolved = await resolveDownloadLink(link.url);
      if (resolved?.url) {
        setResolvedUrls((prev) => ({ ...prev, [link.url]: resolved.url }));
        window.open(resolved.url, "_blank");
      } else {
        // Fallback to original URL if resolution fails
        window.open(link.url, "_blank");
      }
    } catch (err) {
      console.error("Download resolve error:", err);
      setError("Failed to resolve download link");
      // Try original URL as fallback
      window.open(link.url, "_blank");
    } finally {
      setResolving(null);
    }
  };

  if (!links || links.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <Download className="w-5 h-5 text-primary" />
        Download Links
      </h3>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
      <div className="grid gap-2">
        {links.map((link, index) => (
          <button
            key={`${link.quality}-${index}`}
            onClick={() => handleDownload(link)}
            disabled={resolving === link.url}
            className="flex items-center justify-between w-full px-4 py-3 bg-card hover:bg-muted border border-border rounded-lg transition-colors disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              {resolving === link.url ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              ) : resolvedUrls[link.url] ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <Download className="w-5 h-5 text-muted-foreground" />
              )}
              <span className="font-medium text-foreground">
                {link.quality}
              </span>
              {link.size && (
                <span className="text-sm text-muted-foreground">
                  ({link.size})
                </span>
              )}
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}
