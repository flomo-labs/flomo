import type { ProviderTitle } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

// Prazos do cache do catálogo. Vencido o prazo, o dado guardado ainda é
// mostrado e é atualizado em segundo plano (stale-while-revalidate). Os
// Termos do TMDB proíbem manter dado em cache por mais de 6 meses: todos os
// prazos ficam bem abaixo disso.
export const SEARCH_TTL_MS = DAY_MS;

export function titleTtlMs(title: ProviderTitle): number {
  if (title.ref.mediaType === "tv") {
    // Série em exibição ganha episódios novos; encerrada quase não muda.
    return title.status === "ended" || title.status === "canceled"
      ? 30 * DAY_MS
      : DAY_MS;
  }
  return title.status === "released" ? 30 * DAY_MS : 2 * DAY_MS;
}

export function expiresAt(now: Date, ttlMs: number): Date {
  return new Date(now.getTime() + ttlMs);
}

export function isExpired(expires: Date, now: Date): boolean {
  return expires.getTime() <= now.getTime();
}
