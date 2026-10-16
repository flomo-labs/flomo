import type { WatchDateInput } from "@/contracts/library";
import { CATALOG_COUNTRY } from "../catalog/types";
import type { WatchedAtPrecision, WatchEventSource } from "./values";

// Situações em que algo é marcado como visto.
// - `single`: o usuário marcou um episódio ou filme.
// - `previous`: episódios anteriores marcados junto ("marcar anteriores").
export type WatchSituation = "single" | "previous";

// Data padrão de cada situação, quando o usuário não escolhe outra. É o
// único lugar desta regra: o teste com usuários reais pode mudá-la (ex.:
// perguntar a data, ou gravar sem data) sem migration. Hoje: marcado na
// hora = agora, com opção fácil de tirar ou trocar a data; anteriores = sem
// data, para não inflar as estatísticas de hoje.
export const DEFAULT_WATCH_DATE: Record<WatchSituation, WatchDateInput> = {
  single: { kind: "now" },
  previous: { kind: "unknown" },
};

export type ResolvedWatchDate = {
  watchedAt: Date | null;
  precision: WatchedAtPrecision;
  source: WatchEventSource;
};

// Ano mínimo aceito em datas informadas pelo usuário.
const MIN_YEAR = 1900;

// Dia de hoje (AAAA-MM-DD) no fuso do país do catálogo. Decide o que já foi
// lançado e o que é data futura. Usuários fora desse fuso podem ver a
// virada do dia algumas horas antes ou depois (aceitável enquanto o Flomo é
// só do Brasil).
const COUNTRY_TIME_ZONE: Record<string, string> = { BR: "America/Sao_Paulo" };
export function todayIn(country: string, now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: COUNTRY_TIME_ZONE[country] ?? "UTC",
  }).format(now);
}

// Datas aproximadas viram o primeiro dia do período às 12:00 UTC, que cai no
// mesmo dia em qualquer fuso do Brasil (ver src/infra/db/schema/library.ts).
function startOfPeriod(
  precision: "day" | "month" | "year",
  value: string,
): Date | null {
  const [year, month = 1, day = 1] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  // Recusa dias e meses que não existem (2023-02-30, 2023-13).
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

// Converte a escolha do usuário (ou o padrão da situação) no que é gravado.
// Só "agora" conta como `live`; sem data ou com data informada é registro
// retroativo (`backfill`), que não gera atividade no feed.
// `null` quando a data informada não existe, é futura ou muito antiga.
export function resolveWatchDate(
  input: WatchDateInput,
  now: Date,
  today: string = todayIn(CATALOG_COUNTRY, now),
): ResolvedWatchDate | null {
  switch (input.kind) {
    case "now":
      return { watchedAt: now, precision: "exact", source: "live" };
    case "unknown":
      return { watchedAt: null, precision: "unknown", source: "backfill" };
    case "date": {
      const date = startOfPeriod(input.precision, input.value);
      if (!date || date.getUTCFullYear() < MIN_YEAR) return null;
      // O período tem de ter começado: compara o texto (AAAA, AAAA-MM ou
      // AAAA-MM-DD) com o começo de hoje no mesmo formato.
      if (input.value > today.slice(0, input.value.length)) return null;
      return {
        // "Hoje" às 12:00 UTC ainda pode estar no futuro de manhã.
        watchedAt: date > now ? now : date,
        precision: input.precision,
        source: "backfill",
      };
    }
  }
}
