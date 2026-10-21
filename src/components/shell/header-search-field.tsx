"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  SearchCombobox,
  type SearchComboboxLabels,
} from "@/components/catalog/search-combobox";

// Campo do cabeçalho. Em /buscar vem preenchido com o termo da URL (e a
// chave refaz o campo quando a busca muda), para ser o único campo da tela.
export function HeaderSearchField({
  ariaLabel,
  labels,
}: {
  ariaLabel: string;
  labels: SearchComboboxLabels;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const query = pathname === "/buscar" ? (params.get("q") ?? "") : "";
  return (
    <SearchCombobox
      key={query}
      defaultValue={query}
      withIcon
      ariaLabel={ariaLabel}
      className="h-9 rounded-full pl-9"
      listClassName="right-0 left-auto w-[22rem]"
      labels={labels}
    />
  );
}
