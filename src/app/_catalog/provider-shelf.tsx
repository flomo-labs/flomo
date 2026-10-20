import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import type { ProviderBundle } from "@/components/catalog/provider-shelf";
import { ShelfSkeleton } from "@/components/catalog/shelf";
import { SHELF_PROVIDERS } from "@/contracts/catalog";
import { listShelfCached } from "./cached-shelf";
import { MEDIA_SEGMENTS, type MediaSegment } from "./segments";
import { ShelfItems } from "./shelf-items";

// Monta "Em alta no serviço X" com as listas de todos os tipos do serviço, de
// uma vez: trocar de tipo na tela não precisa voltar ao servidor. Serviço
// ausente ou fora da lista cai no primeiro.
export async function buildProviderBundle(
  providerId?: string,
): Promise<ProviderBundle> {
  const t = await getTranslations("Discover");
  const provider =
    SHELF_PROVIDERS.find((p) => p.id === providerId) ?? SHELF_PROVIDERS[0];
  // O filtro Novelas só aparece se o serviço tiver alguma (a consulta é a
  // mesma da prateleira, então vem do cache de 6 horas quando há novelas).
  const novelas = await listShelfCached({
    kind: "provider",
    mediaType: "novelas",
    providerId: provider.id,
  }).catch(() => null);
  const segments: MediaSegment[] =
    novelas?.ok && novelas.value.length > 0
      ? ["tudo", "filmes", "series", "novelas"]
      : ["tudo", "filmes", "series"];
  const lists: Partial<Record<MediaSegment, React.ReactNode>> = {};
  for (const segment of segments) {
    lists[segment] = (
      <Suspense fallback={<ShelfSkeleton />}>
        <ShelfItems
          input={{
            kind: "provider",
            mediaType: MEDIA_SEGMENTS[segment],
            providerId: provider.id,
          }}
        />
      </Suspense>
    );
  }
  return {
    providerId: provider.id,
    heading: t("shelf.provider", {
      provider: provider.name,
      gender: provider.feminine ? "feminine" : "masculine",
    }),
    segments,
    lists,
  };
}
