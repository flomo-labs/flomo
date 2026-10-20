import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Shelf } from "@/components/catalog/shelf";
import type { ShelfInput } from "@/contracts/catalog";
import type { SearchItem } from "@/domain/catalog/types";
import { listShelfCached } from "./cached-shelf";

// Prateleira que falha mostra um aviso no lugar da lista (a tela segue de pé);
// o erro fica no log.
export async function ShelfItems({
  input,
  ranked = false,
}: {
  input: ShelfInput;
  ranked?: boolean;
}) {
  // Lê o catálogo a cada requisição (o cache é o do banco): sem isto o Next
  // tentaria montar a prateleira no build, sem banco, e a gravaria no HTML
  // estático.
  await connection();
  const t = await getTranslations("Discover");
  let items: SearchItem[] = [];
  try {
    items = (await listShelfCached(input)).value;
  } catch (error) {
    console.error("Falha ao carregar a prateleira:", error);
  }
  if (items.length > 0) return <Shelf items={items} ranked={ranked} />;
  return <p className="text-muted-foreground">{t("shelfUnavailable")}</p>;
}
