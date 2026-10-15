// Guarda dos testes de integração: eles só rodam contra o banco indicado em
// `DATABASE_URL_TEST`, nunca contra o `DATABASE_URL` do app (que na Vercel
// aponta para produção). Função pura, para ser testada sem banco.

type Env = Record<string, string | undefined>;

// Extrai o ref do projeto Supabase do host (`db.<ref>.supabase.co` ou o
// usuário `postgres.<ref>` do pooler).
function projectRefs(url: URL): string[] {
  const refs = [url.hostname, decodeURIComponent(url.username)]
    .flatMap((part) => part.split("."))
    .filter(Boolean);
  return refs;
}

export function resolveTestDatabaseUrl(env: Env): string {
  const raw = env.DATABASE_URL_TEST;
  if (!raw) {
    throw new Error(
      "DATABASE_URL_TEST não definida. Aponte para o flomo-dev no .env.local; os testes não usam o DATABASE_URL.",
    );
  }

  if (env.VERCEL || env.VERCEL_ENV || env.NODE_ENV === "production") {
    throw new Error(
      "Testes de integração não rodam em ambiente de produção (Vercel ou NODE_ENV=production).",
    );
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("DATABASE_URL_TEST não é uma URL válida.");
  }

  // Trava extra, opcional: FLOMO_PROD_DB_REF guarda o ref do projeto de
  // produção (só o ref, que não é segredo) para barrar um engano de cópia.
  const prodRef = env.FLOMO_PROD_DB_REF?.trim();
  if (prodRef && projectRefs(url).includes(prodRef)) {
    throw new Error(
      "DATABASE_URL_TEST aponta para o projeto de produção (FLOMO_PROD_DB_REF). Use o flomo-dev.",
    );
  }

  return raw;
}
