// Valores aceitos pela biblioteca. O banco tem os mesmos em CHECKs
// (src/infra/db/schema/library.ts): acrescentar um valor exige migration.

export const LIBRARY_STATUSES = [
  "watchlist",
  "watching",
  "paused",
  "watched",
  "dropped",
] as const;
export type LibraryStatus = (typeof LIBRARY_STATUSES)[number];

// Precisão da data em que foi visto. `unknown` = sem data: marcação em lote,
// onboarding ou import sem data (ver docs/regras-de-negocio.md).
export const WATCHED_AT_PRECISIONS = [
  "exact",
  "day",
  "month",
  "year",
  "unknown",
] as const;
export type WatchedAtPrecision = (typeof WATCHED_AT_PRECISIONS)[number];

// Precisões que dizem o dia: as únicas que o progresso atual guarda.
export const PROGRESS_PRECISIONS: readonly WatchedAtPrecision[] = [
  "exact",
  "day",
];

// Origem do registro: `live` (marcado na hora), `backfill` (retroativo no
// app) e imports, que já entram na lista para a Fase 4 não precisar de
// migration.
export const WATCH_EVENT_SOURCES = [
  "live",
  "backfill",
  "import_trakt",
  "import_tvtime",
  "import_letterboxd",
  "import_csv",
] as const;
export type WatchEventSource = (typeof WATCH_EVENT_SOURCES)[number];
