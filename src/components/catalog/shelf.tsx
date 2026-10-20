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
                <div className="absolute inset-x-0 bottom-0 flex items-end rounded-b-poster gap-1.5 bg-linear-to-t from-black/85 via-black/50 to-transparent px-2 pt-10 pb-2.5">
                  <span
                    aria-hidden
                    className="-ml-[15px] shrink-0 bg-linear-to-b from-rank-from to-rank-to bg-clip-text text-4xl leading-[0.8] font-extrabold tracking-tighter text-transparent sm:text-6xl"
                  >
                    {index + 1}
                  </span>
                  <span className="line-clamp-3 min-w-0 wrap-anywhere pb-0.5 text-sm leading-tight font-bold text-white">
                    <span className="sr-only">{index + 1}. </span>
                    {item.title}
                  </span>
                </div>
              ) : null}
            </div>
            {ranked ? null : (
              <span className="line-clamp-2 text-sm leading-tight font-medium">
                {item.title}
              </span>
            )}
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
          className="aspect-[2/3] animate-pulse rounded-poster bg-muted"
        />
      ))}
    </div>
  );
}
