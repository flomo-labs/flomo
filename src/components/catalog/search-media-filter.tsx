"use client";

import { useRouter } from "next/navigation";
import { SegmentedControl } from "@/components/segmented-control";

export type SearchMedia = "tudo" | "series" | "filmes";

// Filtra os resultados da busca de títulos por tipo (Tudo, Séries, Filmes),
// mantendo o termo (`/buscar?q=`; Séries leva `midia=series` e Filmes
// `midia=filmes`, Tudo não leva nada). A escolha vive na URL, então voltar e
// compartilhar o link funcionam. Trocar de filtro volta à primeira página.
export function SearchMediaFilter({
  query,
  media,
  labels,
}: {
  query: string;
  media: SearchMedia;
  labels: { aria: string; all: string; series: string; movies: string };
}) {
  const router = useRouter();
  return (
    <SegmentedControl
      value={media}
      ariaLabel={labels.aria}
      options={[
        { value: "tudo", label: labels.all },
        { value: "series", label: labels.series },
        { value: "filmes", label: labels.movies },
      ]}
      onChange={(next) => {
        const params = new URLSearchParams({ q: query });
        if (next !== "tudo") params.set("midia", next);
        router.push(`/buscar?${params}`);
      }}
    />
  );
}
