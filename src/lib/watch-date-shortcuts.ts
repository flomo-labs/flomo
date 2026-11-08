// Contas de data do seletor de "quando assistiu", em texto AAAA-MM-DD para
// não depender do fuso do navegador: `today` já vem calculado no do Brasil.

// `today` menos `days` dias (AAAA-MM-DD).
export function daysAgo(today: string, days: number): string {
  const [year, month, day] = today.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day - days));
  return date.toISOString().slice(0, 10);
}

// Aviso (sem bloquear) de data anterior ao lançamento. `value` e `release`
// podem ter precisões diferentes (AAAA, AAAA-MM, AAAA-MM-DD): compara só
// o trecho que `value` informa, para "2020" não ser "antes" de um lançamento
// em 2020-06.
export function isBeforeRelease(
  value: string,
  release: string | null | undefined,
): boolean {
  if (!value || !release) return false;
  return value < release.slice(0, value.length);
}

// "2026-11-07" → "07/11/2026"; "2026" fica "2026".
export function formatDayValue(value: string): string {
  const [year, month, day] = value.split("-");
  return day && month ? `${day}/${month}/${year}` : value;
}
