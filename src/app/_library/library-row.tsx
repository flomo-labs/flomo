import { getTranslations } from "next-intl/server";
import { PosterRow } from "@/components/catalog/poster-row";
import type { LibraryItem } from "@/domain/library/ports";
import { LibraryCaption } from "./library-card";

// Linha compacta de um título da biblioteca, usada na visão em lista.
export async function LibraryRow({ item }: { item: LibraryItem }) {
  const t = await getTranslations();
  return (
    <PosterRow
      href={`/titulo/${item.titleId}`}
      posterPath={item.posterPath}
      posterAlt={t("Title.poster", { title: item.title })}
      size="sm"
      centered
    >
      <span className="line-clamp-2 text-sm font-medium">{item.title}</span>
      <LibraryCaption item={item} showStatus showSeen />
    </PosterRow>
  );
}
