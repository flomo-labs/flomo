import type { WatchDateInput } from "@/contracts/library";
import type { WatchedAtPrecision, WatchEventSource } from "./values";

// Situações em que algo é marcado como visto.
// - `single`: o usuário marcou um episódio ou filme.
// - `previous`: episódios anteriores marcados junto ("marcar anteriores").
export type WatchSituation = "single" | "previous";

// Data padrão de cada situação, quando o usuário não escolhe outra. É o
// único lugar desta regra: o teste com usuários reais pode mudá-la (ex.:
// perguntar a data, ou gravar sem data) sem migration. Decisão do Renato
// (2026-10-16): marcado na hora = agora, com opção fácil de tirar ou trocar
// a data; anteriores = sem data, para não inflar as estatísticas de hoje.
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
): ResolvedWatchDate | null {
  switch (input.kind) {
    case "now":
      return { watchedAt: now, precision: "exact", source: "live" };
    case "unknown":
      return { watchedAt: null, precision: "unknown", source: "backfill" };
    case "date": {
      const date = startOfPeriod(input.precision, input.value);
      if (!date || date.getUTCFullYear() < MIN_YEAR) return null;
      // O período tem de ter começado. Compara com a meia-noite UTC do
      // primeiro dia: no Brasil isso aceita "amanhã" nas últimas horas da
      // noite, folga pequena e melhor do que recusar o dia de hoje.
      if (date.getTime() - 12 * 60 * 60 * 1000 > now.getTime()) return null;
      return {
        watchedAt: date,
        precision: input.precision,
        source: "backfill",
      };
    }
  }
}
