import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/app/_auth/session";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import type { LibraryFilter } from "@/contracts/library";
import { LibraryCard } from "./library-card";
import { loadLibraryItems } from "./queries";

// Grade da Biblioteca para um filtro; usada na abertura da tela e ao trocar de aba.
export async function LibraryList({ filter }: { filter: LibraryFilter }) {
  const t = await getTranslations("LibraryPage");
  const user = await requireUser("/biblioteca");
  const items = await loadLibraryItems(user, filter);

  if (items === null) {
    return (
      <p role="alert" className="text-destructive">
        {t("unavailable")}
      </p>
    );
  }
  if (items.length === 0) {
    return (
      <EmptyState
        message={
          filter === "all"
            ? t("emptyAll")
            : filter === "hidden"
              ? t("emptyHidden")
              : t("emptyFilter")
        }
        action={
          filter === "all" ? (
            <Button render={<Link href="/buscar" />} nativeButton={false}>
              {t("search")}
            </Button>
          ) : undefined
        }
      />
    );
  }
  const showStatus = filter === "all" || filter === "hidden";
  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
      {items.map((item) => (
        <li key={item.titleId}>
          <LibraryCard item={item} showStatus={showStatus} />
        </li>
      ))}
    </ul>
  );
}
