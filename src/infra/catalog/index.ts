import {
  CatalogUnavailableError,
  type CatalogDeps,
  type CatalogProvider,
} from "@/domain/catalog/ports";
import { getDb } from "../db/client";
import { createCatalogStore } from "../db/catalog-repository";
import { createTmdbClient, type TmdbClient } from "./tmdb/client";
import { createTmdbProvider, TMDB_PROVIDER } from "./tmdb/provider";

// Um cliente por instância do servidor: o limite de concorrência só vale se
// todas as requisições dividirem o mesmo cliente.
const globalForTmdb = globalThis as unknown as { flomoTmdb?: TmdbClient };

function getTmdbClient(): TmdbClient {
  // O token de leitura (v4) é o preferido: vai no cabeçalho, não na URL.
  const credential =
    process.env.TMDB_READ_ACCESS_TOKEN || process.env.TMDB_API_KEY || "";
  // Sem credencial o catálogo fica indisponível (mensagem amigável na tela),
  // em vez de derrubar a página com erro do servidor.
  if (!credential) {
    console.error(
      "TMDB sem credencial: defina TMDB_READ_ACCESS_TOKEN no ambiente.",
    );
    throw new CatalogUnavailableError("TMDB não configurado.");
  }
  globalForTmdb.flomoTmdb ??= createTmdbClient({ credential });
  return globalForTmdb.flomoTmdb;
}

// Dependências dos casos de uso do catálogo (domain/catalog/), com o TMDB
// como provedor e o Postgres como cache.
export function createCatalogDeps(
  background: CatalogDeps["background"],
): CatalogDeps {
  // O cliente só é criado quando o TMDB é chamado: sem credencial, o que já
  // está no banco continua sendo servido.
  const provider: CatalogProvider = {
    search: (...args) => createTmdbProvider(getTmdbClient()).search(...args),
    fetchTitle: (...args) =>
      createTmdbProvider(getTmdbClient()).fetchTitle(...args),
    fetchShelf: (...args) =>
      createTmdbProvider(getTmdbClient()).fetchShelf(...args),
    fetchWatchProviders: (...args) =>
      createTmdbProvider(getTmdbClient()).fetchWatchProviders(...args),
  };
  return {
    provider,
    store: createCatalogStore(getDb(), TMDB_PROVIDER),
    now: () => new Date(),
    background,
  };
}
