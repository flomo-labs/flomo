import { type NextRequest, NextResponse } from "next/server";
import { suggestTitles } from "@/app/_catalog/gateway";
import { createRateLimiter } from "@/lib/rate-limit";

// Sugestões da busca enquanto o usuário digita. Pública (o catálogo não pede
// login) e sem sessão: o proxy não passa por aqui.
const checkRate = createRateLimiter({
  limit: 60,
  windowMs: 60_000,
  maxKeys: 5000,
});

const NO_STORE = { "cache-control": "private, no-store" };

function error(code: string, message: string, status: number, headers = {}) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { ...NO_STORE, ...headers } },
  );
}

// Atrás da Vercel o cabeçalho com o IP é preenchido por ela, não pelo cliente.
function clientIp(headers: Headers): string {
  return (
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "desconhecido"
  );
}

export async function GET(request: NextRequest) {
  const rate = checkRate(clientIp(request.headers), Date.now());
  if (!rate.allowed) {
    return error(
      "RATE_LIMITED",
      "Muitas buscas seguidas. Aguarde um instante.",
      429,
      {
        "retry-after": String(rate.retryAfterSeconds),
      },
    );
  }

  const result = await suggestTitles(
    request.nextUrl.searchParams.get("q") ?? "",
  );
  if (!result.ok) {
    return error(
      result.error.code,
      result.error.message,
      result.error.code === "INVALID_INPUT" ? 400 : 503,
    );
  }

  // Um dia no cache compartilhado: prefixos repetidos nem chegam aqui.
  return NextResponse.json(
    { items: result.value },
    {
      headers: {
        "cache-control": "public, s-maxage=86400, stale-while-revalidate=86400",
      },
    },
  );
}
