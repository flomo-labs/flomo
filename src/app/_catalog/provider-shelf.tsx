import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ShelfSkeleton } from "@/components/catalog/shelf";
import type { ProviderShelfData } from "@/components/catalog/provider-shelf";
import { SHELF_PROVIDERS } from "@/contracts/catalog";
import { listShelf } from "./gateway";
import { MEDIA_SEGMENTS, type MediaSegment } from "./segments";
import { ShelfItems } from "./shelf-items";

// Monta "Em alta no serviço X" para um serviço e tipo. Serviço ausente ou fora
// da lista cai no primeiro; tipo ausente ou indisponível cai em "Tudo".
export async function buildProviderShelf(
  providerId?: string,
  segmentName?: string,
): Promise<ProviderShelfData> {
  const t = await getTranslations("Home");
  const provider =
    SHELF_PROVIDERS.find((p) => p.id === providerId) ?? SHELF_PROVIDERS[0];
  // O filtro Novelas só aparece se o serviço tiver alguma (a consulta é a
  // mesma da prateleira, então vem do cache de 6 horas quando há novelas).
  const novelas = await listShelf({
    kind: "provider",
    mediaType: "novelas",
    providerId: provider.id,
  });
  const segments: MediaSegment[] =
    novelas.ok && novelas.value.length > 0
      ? ["tudo", "filmes", "series", "novelas"]
      : ["tudo", "filmes", "series"];
  const segment = segments.find((s) => s === segmentName) ?? "tudo";
  return {
    providerId: provider.id,
    segment,
    segments,
    heading: t("shelf.provider", {
      provider: provider.name,
      gender: provider.feminine ? "feminine" : "masculine",
    }),
    content: (
      <Suspense fallback={<ShelfSkeleton />}>
        <ShelfItems
          input={{
            kind: "provider",
            mediaType: MEDIA_SEGMENTS[segment],
            providerId: provider.id,
          }}
        />
      </Suspense>
    ),
  };
}
