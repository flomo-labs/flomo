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

// Campo de data digitado, no formato brasileiro dd/mm/aaaa.

// Só dígitos, com as barras entrando sozinhas: "0711" → "07/11".
export function maskDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)];
  return parts.filter(Boolean).join("/");
}

// "07/11/2026" → "2026-11-07"; "" se incompleto ou se o dia não existe.
export function parseMaskedDate(text: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return "";
  const [day, month, year] = [match[1], match[2], match[3]].map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return "";
  }
  return `${match[3]}-${match[2]}-${match[1]}`;
}

// Só o ano ("2026"): data com precisão de ano, que o campo mostra como está.
export function isYearOnly(text: string): boolean {
  return /^\d{4}$/.test(text);
}

// "2026-11-07" → "07/11/2026"; "2026" (só o ano) fica "2026".
export function isoToMasked(iso: string): string {
  if (isYearOnly(iso)) return iso;
  const [year, month, day] = iso.split("-");
  return year && month && day ? `${day}/${month}/${year}` : "";
}
