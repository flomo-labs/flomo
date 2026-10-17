"use server";

import type { ProviderBundle } from "@/components/catalog/provider-shelf";
import { buildProviderBundle } from "./provider-shelf";

// Listas de um serviço, carregadas em segundo plano pela Home depois de abrir
// (nada vai para a URL nem é guardado).
export async function loadProviderBundle(
  providerId: string,
): Promise<ProviderBundle> {
  return buildProviderBundle(String(providerId));
}
