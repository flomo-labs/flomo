import {
  deleteWatchRecordInputSchema,
  markEpisodeWatchedInputSchema,
  markMovieWatchedInputSchema,
  markSeasonWatchedInputSchema,
  rewatchEpisodeInputSchema,
  rewatchMovieInputSchema,
  setWatchDateInputSchema,
  unmarkEpisodesWatchedInputSchema,
  unmarkEpisodeWatchedInputSchema,
  unmarkMovieWatchedInputSchema,
} from "@/contracts/library";
import { CATALOG_COUNTRY, type TitleStatus } from "../catalog/types";
import { fail, ok, type Result } from "../result";
import type { AuthenticatedUser } from "../user";
import type { LibraryRepository } from "./ports";
import { type LibraryStatus, PROGRESS_PRECISIONS } from "./values";
import {
  DEFAULT_WATCH_DATE,
  type ResolvedWatchDate,
  resolveWatchDate,
  todayIn,
} from "./watch-date";

// Marcar e desmarcar como assistido (Fase 1.3). Regras em
// docs/regras-de-negocio.md, seção Biblioteca. Cada caso de uso roda numa
// transação só (o `withUser` da borda): ou grava tudo, ou nada.

export type LibraryDeps = { library: LibraryRepository; now: () => Date };

export type MarkWatchedErrorCode =
  | "INVALID_INPUT"
  | "INVALID_DATE"
  | "EPISODE_NOT_FOUND"
  | "TITLE_NOT_FOUND"
  | "NOT_A_MOVIE"
  | "NOT_A_SERIES"
  | "SEASON_NOT_FOUND"
  | "EVENT_NOT_FOUND"
  | "NOT_WATCHED";

const INVALID_DATE_MESSAGE =
  "Escolha uma data que já passou (a partir de 1900).";

// Marcar um episódio põe a série em "Assistindo", saindo de "Quero ver",
// "Pausado" ou "Abandonado". Uma série já em "Assistido" continua assim.
const EPISODE_REPLACES: readonly LibraryStatus[] = [
  "watchlist",
  "paused",
  "dropped",
];
// Marcar um filme o põe em "Assistido", qualquer que seja o status anterior.
const MOVIE_REPLACES: readonly LibraryStatus[] = [
  "watchlist",
  "watching",
  "paused",
  "dropped",
];

// O progresso guarda só datas com dia conhecido (exata ou do dia); "visto em
// 2019" fica só no histórico. Mesma regra de `refreshProgressDate`.
function progressDate(date: ResolvedWatchDate): Date | null {
  return PROGRESS_PRECISIONS.includes(date.precision) ? date.watchedAt : null;
}

// As mensagens padrão do Zod são em inglês; só as nossas (ex.: formato da
// data) chegam ao usuário.
function invalidInput(issues: { code: string; message: string }[]) {
  const custom = issues.find((i) => i.code === "custom");
  return fail("INVALID_INPUT" as const, custom?.message ?? "Dados inválidos.");
}

// Série encerrada ou cancelada com todos os episódios regulares já lançados
// vistos vira "Assistido" sozinha; se deixa de estar completa (episódio
// desmarcado, ou episódio novo no catálogo) volta a "Assistindo". Série em
// exibição nunca vira "Assistido" sozinha.
const FINISHED_CATALOG_STATUSES: readonly TitleStatus[] = ["ended", "canceled"];

async function syncSeriesStatus(
  deps: LibraryDeps,
  userId: string,
  titleId: string,
  // Ao marcar, uma série já em "Assistido" continua assim; só desmarcar a rebaixa.
  downgrade: boolean,
): Promise<void> {
  const progress = await deps.library.getSeriesProgress(
    userId,
    titleId,
    todayIn(CATALOG_COUNTRY, deps.now()),
  );
  const complete =
    FINISHED_CATALOG_STATUSES.includes(progress.catalogStatus) &&
    progress.released > 0 &&
    progress.watched >= progress.released;
  if (complete) {
    await deps.library.upsertTitleStatus(userId, titleId, "watched", [
      "watching",
    ]);
  } else if (downgrade && progress.watched === 0) {
    // Sem nenhum episódio visto, a série volta a "Quero ver". Pausado e
    // Abandonado são escolhas do usuário e ficam como estão.
    await deps.library.upsertTitleStatus(userId, titleId, "watchlist", [
      "watching",
      "watched",
    ]);
  } else if (downgrade) {
    await deps.library.upsertTitleStatus(userId, titleId, "watching", [
      "watched",
    ]);
  }
}

export type MarkEpisodeResult = {
  // `false` quando o episódio já estava visto (nada gravado para ele).
  marked: boolean;
  // Quantos episódios anteriores foram marcados junto, sem data.
  previousMarked: number;
};

export async function markEpisodeWatched(
  deps: LibraryDeps,
  user: AuthenticatedUser,
  input: unknown,
): Promise<Result<MarkEpisodeResult, MarkWatchedErrorCode>> {
  const parsed = markEpisodeWatchedInputSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error.issues);
  const { episodeId, when, includePrevious } = parsed.data;

  const now = deps.now();
  const episode = await deps.library.findEpisode(episodeId);
  if (!episode) return fail("EPISODE_NOT_FOUND", "Episódio não encontrado.");

  const date = resolveWatchDate(
    when ?? DEFAULT_WATCH_DATE.single,
    now,
    undefined,
    episode.airDate,
  );
  if (!date) return fail("INVALID_DATE", INVALID_DATE_MESSAGE);

  // Primeiro, porque trava a linha do título: dois cliques simultâneos na
  // mesma série esperam um pelo outro.
  await deps.library.upsertTitleStatus(
    user.id,
    episode.titleId,
    "watching",
    EPISODE_REPLACES,
  );

  const [marked] = await deps.library.insertProgress(user.id, episode.titleId, [
    { episodeId, watchedAt: progressDate(date) },
  ]);
  if (marked) {
    await deps.library.insertEvents(user.id, [
      {
        titleId: episode.titleId,
        episodeId,
        watchedAt: date.watchedAt,
        precision: date.precision,
        source: date.source,
      },
    ]);
  }

  let previousMarked = 0;
  if (includePrevious) {
    // Sem escolha de data de exibição, os anteriores ficam sem data. Com ela,
    // cada anterior recebe a própria data de exibição.
    const today = todayIn(CATALOG_COUNTRY, now);
    const previous = await deps.library.listPreviousUnwatched(
      user.id,
      episode,
      today,
    );
    const dated = previous.map((p) => {
      const d = resolveWatchDate(
        when?.kind === "airDate" ? when : DEFAULT_WATCH_DATE.previous,
        now,
        today,
        p.airDate,
      );
      // Anterior já lançado nunca tem data de exibição no futuro.
      if (!d) throw new Error("Data de anterior inválida.");
      return { episodeId: p.id, date: d };
    });
    const insertedIds = new Set(
      await deps.library.insertProgress(
        user.id,
        episode.titleId,
        dated.map((d) => ({
          episodeId: d.episodeId,
          watchedAt: progressDate(d.date),
        })),
      ),
    );
    const inserted = dated.filter((d) => insertedIds.has(d.episodeId));
    await deps.library.insertEvents(
      user.id,
      inserted.map((d) => ({
        titleId: episode.titleId,
        episodeId: d.episodeId,
        watchedAt: d.date.watchedAt,
        precision: d.date.precision,
        source: d.date.source,
      })),
    );
    previousMarked = inserted.length;
  }

  if (marked || previousMarked > 0) {
    await syncSeriesStatus(deps, user.id, episode.titleId, false);
    // Atividade nova traz o título de volta à lista.
    await deps.library.setTitleHidden(user.id, episode.titleId, false);
  }
  return ok({ marked: Boolean(marked), previousMarked });
}

export async function markMovieWatched(
  deps: LibraryDeps,
  user: AuthenticatedUser,
  input: unknown,
): Promise<Result<{ marked: boolean }, MarkWatchedErrorCode>> {
  const parsed = markMovieWatchedInputSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error.issues);
  const { titleId, when } = parsed.data;

  const mediaType = await deps.library.findTitleMediaType(titleId);
  if (!mediaType) return fail("TITLE_NOT_FOUND", "Título não encontrado.");
  if (mediaType !== "movie") {
    return fail("NOT_A_MOVIE", "Séries são marcadas por episódio.");
  }

  const date = resolveWatchDate(
    when ?? DEFAULT_WATCH_DATE.single,
    deps.now(),
    undefined,
    when?.kind === "airDate"
      ? await deps.library.findTitleReleaseDate(titleId)
      : null,
  );
  if (!date) return fail("INVALID_DATE", INVALID_DATE_MESSAGE);

  // A trava do título vem antes da checagem, para dois cliques simultâneos
  // não gravarem o filme duas vezes.
  await deps.library.upsertTitleStatus(
    user.id,
    titleId,
    "watched",
    MOVIE_REPLACES,
  );
  if (await deps.library.hasMovieEvent(user.id, titleId)) {
    return ok({ marked: false });
  }
  await deps.library.insertEvents(user.id, [
    {
      titleId,
      episodeId: null,
      watchedAt: date.watchedAt,
      precision: date.precision,
      source: date.source,
    },
  ]);
  // Atividade nova traz o título de volta à lista.
  await deps.library.setTitleHidden(user.id, titleId, false);
  return ok({ marked: true });
}

export type MarkSeasonResult = {
  // Episódios marcados agora (os que ainda não estavam vistos).
  marked: number;
  // Episódios lançados da temporada que já estavam vistos e não mudaram.
  alreadyMarked: number;
  // Quais foram marcados agora, para desfazer (`unmarkEpisodesWatched`).
  markedEpisodeIds: string[];
};

// Marca a temporada regular inteira: os episódios lançados (ou sem data no
// catálogo) que o usuário ainda não viu, todos com a mesma escolha de data.
// Com `airDate`, cada episódio recebe a própria data de exibição. Episódio
// ainda não lançado fica de fora, como em "marcar anteriores". Idempotente:
// o que já estava visto não é gravado de novo nem muda de data.
export async function markSeasonWatched(
  deps: LibraryDeps,
  user: AuthenticatedUser,
  input: unknown,
): Promise<Result<MarkSeasonResult, MarkWatchedErrorCode>> {
  const parsed = markSeasonWatchedInputSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error.issues);
  const { titleId, seasonNumber, when } = parsed.data;

  const now = deps.now();
  const today = todayIn(CATALOG_COUNTRY, now);
  // A escolha de data vale para a temporada toda: uma data informada inválida
  // ou futura é recusada antes de gravar qualquer coisa.
  if (when.kind !== "airDate" && !resolveWatchDate(when, now, today)) {
    return fail("INVALID_DATE", INVALID_DATE_MESSAGE);
  }

  const mediaType = await deps.library.findTitleMediaType(titleId);
  if (!mediaType) return fail("TITLE_NOT_FOUND", "Título não encontrado.");
  if (mediaType !== "tv") {
    return fail("NOT_A_SERIES", "Só séries têm temporadas.");
  }
  const season = await deps.library.listSeasonEpisodes(
    user.id,
    titleId,
    seasonNumber,
  );
  if (season.length === 0) {
    return fail("SEASON_NOT_FOUND", "Temporada não encontrada.");
  }

  const released = season.filter((e) => !e.airDate || e.airDate <= today);
  const toMark = released.filter((e) => !e.watched);
  const alreadyMarked = released.length - toMark.length;
  if (toMark.length === 0) {
    return ok({ marked: 0, alreadyMarked, markedEpisodeIds: [] });
  }

  // Primeiro, porque trava a linha do título (ver `markEpisodeWatched`).
  await deps.library.upsertTitleStatus(
    user.id,
    titleId,
    "watching",
    EPISODE_REPLACES,
  );

  const dated = toMark.map((e) => {
    const date = resolveWatchDate(when, now, today, e.airDate);
    if (!date)
      throw new Error("Data de exibição de episódio lançado inválida.");
    return { episodeId: e.id, date };
  });
  const insertedIds = await deps.library.insertProgress(
    user.id,
    titleId,
    dated.map((d) => ({
      episodeId: d.episodeId,
      watchedAt: progressDate(d.date),
    })),
  );
  // A PK decide em caso de corrida: só quem entrou agora ganha registro.
  const inserted = new Set(insertedIds);
  const events = dated.filter((d) => inserted.has(d.episodeId));
  await deps.library.insertEvents(
    user.id,
    events.map((d) => ({
      titleId,
      episodeId: d.episodeId,
      watchedAt: d.date.watchedAt,
      precision: d.date.precision,
      source: d.date.source,
    })),
  );

  if (events.length > 0) {
    await syncSeriesStatus(deps, user.id, titleId, false);
    await deps.library.setTitleHidden(user.id, titleId, false);
  }
  return ok({
    marked: events.length,
    alreadyMarked: alreadyMarked + (toMark.length - events.length),
    markedEpisodeIds: events.map((d) => d.episodeId),
  });
}

// Apaga um registro do histórico. Se era o último do episódio, o episódio
// deixa de estar visto; se sobra algum, continua visto, com a data do
// registro mais recente que ficou. O status do título só muda se estava em
// "Assistido" e deixa de valer: a série incompleta volta a "Assistindo" e o
// filme sem registros volta a "Quero ver".
async function removeRecord(
  deps: LibraryDeps,
  user: AuthenticatedUser,
  eventId: string,
): Promise<boolean> {
  const deleted = await deps.library.deleteEvent(user.id, eventId);
  if (!deleted) return false;
  if (deleted.episodeId) {
    const left = await deps.library.countEpisodeEvents(
      user.id,
      deleted.episodeId,
    );
    if (left === 0) {
      await deps.library.deleteEpisodeProgress(user.id, deleted.episodeId);
      await syncSeriesStatus(deps, user.id, deleted.titleId, true);
    } else {
      await deps.library.refreshProgressDate(user.id, deleted.episodeId);
    }
  } else if (!(await deps.library.hasMovieEvent(user.id, deleted.titleId))) {
    // Filme sem nenhum registro deixa de ser Assistido e volta a Quero ver.
    await deps.library.upsertTitleStatus(
      user.id,
      deleted.titleId,
      "watchlist",
      ["watched"],
    );
  }
  return true;
}

// Desmarcar tira só o registro mais recente do episódio ou filme; o item
// deixa de estar visto quando não sobra nenhum.
export async function unmarkEpisodeWatched(
  deps: LibraryDeps,
  user: AuthenticatedUser,
  input: unknown,
): Promise<Result<{ removed: boolean }, MarkWatchedErrorCode>> {
  const parsed = unmarkEpisodeWatchedInputSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error.issues);
  const eventId = await deps.library.findLatestEventId(user.id, {
    episodeId: parsed.data.episodeId,
  });
  return ok({
    removed: eventId ? await removeRecord(deps, user, eventId) : false,
  });
}

// Desfaz a marcação de vários episódios de uma vez (o "desfazer" da
// temporada): tira o registro mais recente de cada um.
export async function unmarkEpisodesWatched(
  deps: LibraryDeps,
  user: AuthenticatedUser,
  input: unknown,
): Promise<Result<{ removed: number }, MarkWatchedErrorCode>> {
  const parsed = unmarkEpisodesWatchedInputSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error.issues);
  let removed = 0;
  for (const episodeId of new Set(parsed.data.episodeIds)) {
    const eventId = await deps.library.findLatestEventId(user.id, {
      episodeId,
    });
    if (eventId && (await removeRecord(deps, user, eventId))) removed++;
  }
  return ok({ removed });
}

export async function unmarkMovieWatched(
  deps: LibraryDeps,
  user: AuthenticatedUser,
  input: unknown,
): Promise<Result<{ removed: boolean }, MarkWatchedErrorCode>> {
  const parsed = unmarkMovieWatchedInputSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error.issues);
  const eventId = await deps.library.findLatestEventId(user.id, {
    titleId: parsed.data.titleId,
  });
  return ok({
    removed: eventId ? await removeRecord(deps, user, eventId) : false,
  });
}

// Apagar um registro escolhido na lista de registros do item.
export async function deleteWatchRecord(
  deps: LibraryDeps,
  user: AuthenticatedUser,
  input: unknown,
): Promise<Result<{ removed: true }, MarkWatchedErrorCode>> {
  const parsed = deleteWatchRecordInputSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error.issues);
  if (!(await removeRecord(deps, user, parsed.data.eventId))) {
    return fail("EVENT_NOT_FOUND", "Registro não encontrado.");
  }
  return ok({ removed: true as const });
}

// Trocar a data de um registro: tirar a data, dizer "foi hoje" ou informar
// outra. Registros importados continuam com a origem do import.
export async function setWatchDate(
  deps: LibraryDeps,
  user: AuthenticatedUser,
  input: unknown,
): Promise<Result<{ eventId: string }, MarkWatchedErrorCode>> {
  const parsed = setWatchDateInputSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error.issues);
  const { eventId, when } = parsed.data;

  const target = await deps.library.findEventCatalogDate(user.id, eventId);
  if (!target) return fail("EVENT_NOT_FOUND", "Registro não encontrado.");
  const date = resolveWatchDate(
    when,
    deps.now(),
    undefined,
    target.catalogDate,
  );
  if (!date) return fail("INVALID_DATE", INVALID_DATE_MESSAGE);

  const updated = await deps.library.updateEventDate(
    user.id,
    eventId,
    date.watchedAt,
    date.precision,
    date.source,
  );
  if (!updated) return fail("EVENT_NOT_FOUND", "Registro não encontrado.");
  if (updated.episodeId) {
    await deps.library.refreshProgressDate(user.id, updated.episodeId);
  }
  return ok({ eventId });
}

// Registrar de novo (rever): mais um registro no histórico de um episódio ou
// filme já visto, por padrão agora. Não repete o progresso (a PK decide) nem
// muda o status do título. Só o item já visto pode ser revisto; rever a série
// inteira, em rodadas, é da Fase 2.
export async function rewatchEpisode(
  deps: LibraryDeps,
  user: AuthenticatedUser,
  input: unknown,
): Promise<Result<{ recorded: true }, MarkWatchedErrorCode>> {
  const parsed = rewatchEpisodeInputSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error.issues);
  const { episodeId, when } = parsed.data;

  const date = resolveWatchDate(when ?? DEFAULT_WATCH_DATE.single, deps.now());
  if (!date) return fail("INVALID_DATE", INVALID_DATE_MESSAGE);

  const episode = await deps.library.findEpisode(episodeId);
  if (!episode) return fail("EPISODE_NOT_FOUND", "Episódio não encontrado.");
  if (!(await deps.library.hasEpisodeProgress(user.id, episodeId))) {
    return fail(
      "NOT_WATCHED",
      "Marque o episódio como assistido antes de rever.",
    );
  }
  await deps.library.insertEvents(user.id, [
    {
      titleId: episode.titleId,
      episodeId,
      watchedAt: date.watchedAt,
      precision: date.precision,
      source: date.source,
    },
  ]);
  await deps.library.refreshProgressDate(user.id, episodeId);
  return ok({ recorded: true as const });
}

export async function rewatchMovie(
  deps: LibraryDeps,
  user: AuthenticatedUser,
  input: unknown,
): Promise<Result<{ recorded: true }, MarkWatchedErrorCode>> {
  const parsed = rewatchMovieInputSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error.issues);
  const { titleId, when } = parsed.data;

  const date = resolveWatchDate(when ?? DEFAULT_WATCH_DATE.single, deps.now());
  if (!date) return fail("INVALID_DATE", INVALID_DATE_MESSAGE);

  const mediaType = await deps.library.findTitleMediaType(titleId);
  if (!mediaType) return fail("TITLE_NOT_FOUND", "Título não encontrado.");
  if (mediaType !== "movie") {
    return fail("NOT_A_MOVIE", "Séries são revistas por episódio.");
  }
  if (!(await deps.library.hasMovieEvent(user.id, titleId))) {
    return fail("NOT_WATCHED", "Marque o filme como assistido antes de rever.");
  }
  await deps.library.insertEvents(user.id, [
    {
      titleId,
      episodeId: null,
      watchedAt: date.watchedAt,
      precision: date.precision,
      source: date.source,
    },
  ]);
  return ok({ recorded: true as const });
}
