"use client";

import { useRouter } from "next/navigation";
import { SegmentedControl } from "@/components/segmented-control";

export type SearchKind = "titulos" | "pessoas";

// Alterna a busca entre títulos e pessoas, mantendo o termo (`/buscar?q=`;
// pessoas leva `tipo=pessoas`). A escolha vive na URL, então voltar e
// compartilhar o link funcionam. Trocar de aba volta à primeira página.
export function SearchKindTabs({
  query,
  kind,
  labels,
  canSearchPeople,
}: {
  query: string;
  kind: SearchKind;
  labels: { aria: string; titles: string; people: string };
  // Só quem entrou na conta busca pessoas; para visitante a aba some.
  canSearchPeople: boolean;
}) {
  const router = useRouter();
  if (!canSearchPeople) return null;
  return (
    <SegmentedControl
      value={kind}
      ariaLabel={labels.aria}
      options={[
        { value: "titulos", label: labels.titles },
        { value: "pessoas", label: labels.people },
      ]}
      onChange={(next) => {
        const params = new URLSearchParams({ q: query });
        if (next === "pessoas") params.set("tipo", "pessoas");
        router.push(`/buscar?${params}`);
      }}
    />
  );
}
