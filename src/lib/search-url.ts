import type { MediaType } from "@/contracts/catalog";

// Filtro de tipo da busca de títulos na URL (`midia`): Tudo não leva
// parâmetro; Séries e Filmes levam `midia=series` / `midia=filmes`.
export type SearchMedia = "tudo" | "series" | "filmes";

const MEDIA_TYPE_OF: Record<Exclude<SearchMedia, "tudo">, MediaType> = {
  series: "tv",
  filmes: "movie",
};

// Qualquer valor fora da lista (inclusive ausente) vale Tudo.
export function parseMedia(value: string | null | undefined): SearchMedia {
  return value === "series" || value === "filmes" ? value : "tudo";
}

// Tipo de catálogo do filtro; `undefined` em Tudo (busca os dois juntos).
export function mediaTypeOf(media: SearchMedia): MediaType | undefined {
  return media === "tudo" ? undefined : MEDIA_TYPE_OF[media];
}

// Único lugar que monta o endereço da busca, para o termo, a aba e o filtro
// não se perderem em nenhum caminho.
export function searchHref({
  query,
  people = false,
  media = "tudo",
  page,
}: {
  query: string;
  people?: boolean;
  media?: SearchMedia;
  page?: number;
}): string {
  const params = new URLSearchParams({ q: query });
  if (people) params.set("tipo", "pessoas");
  else if (media !== "tudo") params.set("midia", media);
  if (page && page > 1) params.set("pagina", String(page));
  return `/buscar?${params}`;
}

// Endereço de uma nova busca feita de qualquer tela: só em /buscar ela herda a
// aba e o filtro atuais (em outra tela começa limpa).
export function nextSearchHref(
  query: string,
  pathname: string,
  current: { get(name: string): string | null },
): string {
  if (pathname !== "/buscar") return searchHref({ query });
  return searchHref({
    query,
    people: current.get("tipo") === "pessoas",
    media: parseMedia(current.get("midia")),
  });
}
