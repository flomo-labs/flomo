// Cabeçalhos de segurança de todas as respostas (next.config.ts).
//
// A CSP aplicada só fecha o que não depende de script: iframe de outro site
// (clickjacking), <object> e <base>. A CSP completa vai em Report-Only: o
// navegador mostra no console o que seria bloqueado, sem bloquear, até ela
// poder ser aplicada. Nonce exigiria renderização dinâmica em toda página, o
// que vai contra o Cache Components.

// Pôsteres e logos vêm direto do CDN do TMDB (`unoptimized` no <Image>).
const IMAGE_HOSTS = ["https://image.tmdb.org"];

export const ENFORCED_CSP = [
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
].join("; ");

// Sem `form-action`: o login com Google é um POST que redireciona para fora,
// e o Chrome aplica `form-action` também ao redirecionamento.
export function reportOnlyCsp(isDev: boolean): string {
  return [
    "default-src 'self'",
    // `unsafe-eval` só no dev: o React usa eval para os rastros de erro.
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${IMAGE_HOSTS.join(" ")}`,
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function securityHeaders(isDev: boolean) {
  return [
    { key: "Content-Security-Policy", value: ENFORCED_CSP },
    {
      key: "Content-Security-Policy-Report-Only",
      value: reportOnlyCsp(isDev),
    },
    // Navegadores antigos que não leem `frame-ancestors`.
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
    },
    // Sem `preload`: entrar na lista dos navegadores é difícil de desfazer.
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains",
    },
  ];
}
