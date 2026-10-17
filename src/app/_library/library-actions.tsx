"use server";

import { LIBRARY_FILTERS } from "@/contracts/library";
import { LibraryList } from "./library-list";

// Troca de aba da Biblioteca: devolve a lista já montada, sem mexer na URL.
export async function loadLibraryList(filter: string) {
  const valid = LIBRARY_FILTERS.find((f) => f === filter) ?? "all";
  return <LibraryList filter={valid} />;
}
