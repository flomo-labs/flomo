import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Poster } from "@/components/catalog/poster";
import type { SearchItem } from "@/domain/catalog/types";
import { titleRefPath } from "@/lib/title-paths";

// Prateleira de pôsteres da Home: cada item abre a página do título.
// `ranked` mostra a posição (Top 10).
export async function Shelf({
  items,
  ranked = false,
}: {
  items: SearchItem[];
  ranked?: boolean;
}) {
  const t = await getTranslations("Title");
  return (
    <ol className="grid grid-cols-3 gap-3 sm:grid-cols-5">
      {items.map((item, index) => (
        <li key={`${item.ref.mediaType}-${item.ref.externalId}`}>
          <Link
            href={titleRefPath(item.ref)}
            className="group flex flex-col gap-1.5"
          >
            <div className="relative">
              <Poster
                path={item.posterPath}
                size="w342"
                alt={t("poster", { title: item.title })}
                className="transition-opacity group-hover:opacity-80"
              />
              {ranked ? (
                <span
                  aria-hidden
                  className="absolute bottom-1 left-1 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
                >
                  {index + 1}
                </span>
              ) : null}
            </div>
            <span className="line-clamp-2 text-sm leading-tight font-medium">
              {ranked ? <span className="sr-only">{index + 1}. </span> : null}
              {item.title}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export function ShelfSkeleton() {
  return (
    <div aria-hidden className="grid grid-cols-3 gap-3 sm:grid-cols-5">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className="aspect-[2/3] animate-pulse rounded-lg bg-muted"
        />
      ))}
    </div>
  );
}
