type Env = Record<string, string | undefined>;

// URL pública do app, base dos redirects do login. Em preview da Vercel cada
// deploy tem um endereço próprio (VERCEL_URL), então ele vale mais que o
// NEXT_PUBLIC_SITE_URL fixo; fora dali a variável fixa é a fonte.
export function resolveSiteUrl(env: Env = process.env): string | undefined {
  if (env.VERCEL_ENV === "preview" && env.VERCEL_URL) {
    return `https://${env.VERCEL_URL}`;
  }
  return env.NEXT_PUBLIC_SITE_URL || undefined;
}
