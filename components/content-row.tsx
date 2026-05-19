import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { MediaCard } from "./media-card";
import type { ContentItem, AnimeItem } from "@/lib/types";

interface ContentRowProps {
  title: string;
  items: (ContentItem | AnimeItem)[];
  type?: "content" | "anime";
  viewAllHref?: string;
}

export function ContentRow({ title, items, type = "content", viewAllHref }: ContentRowProps) {
  // Ensure items is always an array
  const itemsArray = Array.isArray(items) ? items : [];
  if (itemsArray.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-foreground">{title}</h2>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {itemsArray.slice(0, 12).map((item, index) => (
          <MediaCard key={`${item.url}-${index}`} item={item} type={type} />
        ))}
      </div>
    </section>
  );
}
