import { cacheLife } from "next/cache";
import type { ShelfInput } from "@/contracts/catalog";
import { listShelf } from "./gateway";

// Prateleiras da Home com cache em memória do Next (por cima do cache de 6
// horas no banco): atualizar a página ou trocar de serviço não relê o banco.
// Lista levemente desatualizada na Home não é problema; nunca use isto para
// dados do usuário. Resultado com falha não entra no cache (lança em vez de
// devolver), para um erro passageiro não ficar guardado.
export async function listShelfCached(input: ShelfInput) {
  "use cache";
  cacheLife("hours");
  const result = await listShelf(input);
  if (!result.ok)
    throw new Error(`Prateleira indisponível: ${result.error.code}`);
  return result;
}
