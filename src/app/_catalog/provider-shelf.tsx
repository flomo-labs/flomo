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
  const provider =
    SHELF_PROVIDERS.find((p) => p.id === providerId) ?? SHELF_PROVIDERS[0];
  // Os filtros Novelas e Animes só aparecem se o serviço tiver algum título
  // daquele tipo (a consulta é a mesma da prateleira, então vem do cache de 6
  // horas quando há).
  const optional = (["novelas", "animes"] as const).map(async (segment) => {
    const result = await listShelfCached({
      kind: "provider",
      mediaType: MEDIA_SEGMENTS[segment],
      providerId: provider.id,
    }).catch(() => null);
    return result?.ok && result.value.length > 0 ? segment : null;
  });
  const segments: MediaSegment[] = [
    "tudo",
    "series",
    "filmes",
    ...(await Promise.all(optional)).filter((s) => s !== null),
  ];
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
    segments,
    lists,
  };
}
