import { cacheLife } from "next/cache";
import { getTitle } from "./gateway";

// Título com cache em memória do Next (por cima do cache do banco): abrir a
// página do título de novo não espera a leitura no banco antes de mostrar o
// cabeçalho e a sinopse (LCP, #242). Sinopse e nota do TMDB podem ficar
// algumas horas defasadas, aceito pelo Renato. Nunca use isto para dados do
// usuário. Resultado com falha não entra no cache (a função interna lança), e
// qualquer falha cai na leitura direta, para um erro passageiro não ficar
// guardado nem esconder o resultado real.
async function readTitleCached(titleId: string) {
  "use cache";
  cacheLife("hours");
  const result = await getTitle(titleId);
  if (!result.ok) throw new Error(`Título indisponível: ${result.error.code}`);
  return result;
}

export async function getTitleCached(titleId: string) {
  try {
    return await readTitleCached(titleId);
  } catch {
    return getTitle(titleId);
  }
}
