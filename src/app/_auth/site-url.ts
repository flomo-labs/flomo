type Env = Record<string, string | undefined>;

// URL pública do app, base dos redirects do login. Em preview da Vercel o
// endereço varia (alias da branch ou deploy), e o cookie do login é preso ao
// host, então vale o host da própria requisição; fora dali a variável fixa
// NEXT_PUBLIC_SITE_URL é a fonte.
export function resolveSiteUrl(
  env: Env = process.env,
  requestHost?: string | null,
): string | undefined {
  if (env.VERCEL_ENV === "preview" && requestHost) {
    return `https://${requestHost}`;
  }
  return env.NEXT_PUBLIC_SITE_URL || undefined;
}
