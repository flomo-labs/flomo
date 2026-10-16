import type { WatchedAtPrecision } from "@/domain/library/values";

// Texto curto da data em que foi visto, no fuso do Brasil (as datas
// aproximadas são gravadas ao meio-dia UTC, que cai no mesmo dia aqui).
const TIME_ZONE = "America/Sao_Paulo";

export function watchDateLabel(
  watchedAt: Date | null,
  precision: WatchedAtPrecision,
): string {
  if (!watchedAt || precision === "unknown") return "Sem data";
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: TIME_ZONE,
      ...options,
    }).format(watchedAt);
  switch (precision) {
    case "year":
      return format({ year: "numeric" });
    case "month":
      return format({ month: "long", year: "numeric" });
    default:
      return format({ day: "2-digit", month: "2-digit", year: "numeric" });
  }
}
