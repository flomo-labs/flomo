// Data de calendário (AAAA-MM-DD, vinda do catálogo) no formato da locale.
// Lê o dia como UTC e formata em UTC para o fuso não mudar o dia. Precisões
// menores (AAAA, AAAA-MM) e valores que não são data voltam como vieram.
export function formatCalendarDay(value: string, locale: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const [year, month, day] = [match[1], match[2], match[3]].map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1) return value;
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone: "UTC",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  } catch {
    return value;
  }
}
