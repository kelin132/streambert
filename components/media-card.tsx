import Link from "next/link";
import Image from "next/image";
import { Play } from "lucide-react";
import { getImageUrl } from "@/lib/api";
import type { ContentItem, AnimeItem } from "@/lib/types";

interface MediaCardProps {
  item: ContentItem | AnimeItem;
  type?: "content" | "anime";
}

export function MediaCard({ item, type = "content" }: MediaCardProps) {
  const href = `/watch?url=${encodeURIComponent(item.url)}&type=${type}`;
  const year = "year" in item ? item.year : undefined;
  const itemType = item.type || (type === "anime" ? "Anime" : "Content");

  return (
    <Link href={href} className="group block">
      <div className="card-hover relative aspect-[2/3] rounded-lg overflow-hidden bg-card">
        <Image
          src={getImageUrl(item.image)}
          alt={item.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <Play className="w-6 h-6 text-primary-foreground ml-1" fill="currentColor" />
          </div>
        </div>

        {/* Type badge */}
        <div className="absolute top-2 left-2">
          <span className="px-2 py-1 text-xs font-medium bg-primary/90 text-primary-foreground rounded">
            {type === "anime" ? "ANIME" : itemType?.toUpperCase().slice(0, 6) || "HD"}
          </span>
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-background to-transparent">
          <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-2">
            {item.title}
          </h3>
          {year && (
            <p className="text-xs text-muted-foreground mt-1">{year}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
