"use server";

import type { ProviderShelfData } from "@/components/catalog/provider-shelf";
import { buildProviderShelf } from "./provider-shelf";

// Troca de serviço ou tipo na Home: devolve a prateleira já montada, sem
// mexer na URL nem guardar a escolha.
export async function loadProviderShelf(
  providerId: string,
  segment: string,
): Promise<ProviderShelfData> {
  return buildProviderShelf(String(providerId), String(segment));
}
