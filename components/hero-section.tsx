import Link from "next/link";
import Image from "next/image";
import { Play, Info } from "lucide-react";
import { getImageUrl } from "@/lib/api";
import type { ContentItem } from "@/lib/types";

interface HeroSectionProps {
  item: ContentItem;
}

export function HeroSection({ item }: HeroSectionProps) {
  return (
    <section className="relative h-[70vh] min-h-[500px] mb-8 -mt-16">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src={getImageUrl(item.image)}
          alt={item.title}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        {/* Gradients */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-end pb-16">
        <div className="max-w-2xl">
          <span className="inline-block px-3 py-1 bg-primary text-primary-foreground text-sm font-medium rounded mb-4">
            {item.type || "Featured"}
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 leading-tight text-balance">
            {item.title}
          </h1>
          {item.description && (
            <p className="text-muted-foreground text-lg mb-6 line-clamp-3 text-pretty">
              {item.description}
            </p>
          )}
          <div className="flex items-center gap-4">
            <Link
              href={`/watch?url=${encodeURIComponent(item.url)}&type=content`}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              <Play className="w-5 h-5" fill="currentColor" />
              Watch Now
            </Link>
            <Link
              href={`/watch?url=${encodeURIComponent(item.url)}&type=content`}
              className="flex items-center gap-2 px-6 py-3 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
            >
              <Info className="w-5 h-5" />
              More Info
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
