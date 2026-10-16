import {
  deleteWatchRecordInputSchema,
  markEpisodeWatchedInputSchema,
  markMovieWatchedInputSchema,
  rewatchEpisodeInputSchema,
  rewatchMovieInputSchema,
  setWatchDateInputSchema,
  unmarkEpisodeWatchedInputSchema,
  unmarkMovieWatchedInputSchema,
} from "@/contracts/library";
import { CATALOG_COUNTRY } from "../catalog/types";
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

// Marcar e desmarcar como visto (Fase 1.3). Regras em
// docs/regras-de-negocio.md, seção Biblioteca. Cada caso de uso roda numa
// transação só (o `withUser` da borda): ou grava tudo, ou nada.

export type LibraryDeps = { library: LibraryRepository; now: () => Date };

export type MarkWatchedErrorCode =
  | "INVALID_INPUT"
  | "INVALID_DATE"
  | "EPISODE_NOT_FOUND"
  | "TITLE_NOT_FOUND"
  | "NOT_A_MOVIE"
  | "EVENT_NOT_FOUND"
  | "NOT_WATCHED";

const INVALID_DATE_MESSAGE =
  "Escolha uma data que já passou (a partir de 1900).";

// Marcar um episódio põe a série em "Assistindo", saindo de "Quero ver",
// "Pausado" ou "Abandonado". Uma série já em "Visto" continua assim.
const EPISODE_REPLACES: readonly LibraryStatus[] = [
  "watchlist",
  "paused",
  "dropped",
];
// Marcar um filme o põe em "Visto", qualquer que seja o status anterior.
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
  const date = resolveWatchDate(when ?? DEFAULT_WATCH_DATE.single, now);
  if (!date) return fail("INVALID_DATE", INVALID_DATE_MESSAGE);

  const episode = await deps.library.findEpisode(episodeId);
  if (!episode) return fail("EPISODE_NOT_FOUND", "Episódio não encontrado.");

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
    const previousDate = resolveWatchDate(DEFAULT_WATCH_DATE.previous, now);
    if (!previousDate) throw new Error("Data padrão de anteriores inválida.");
    const previousIds = await deps.library.listPreviousUnwatched(
      user.id,
      episode,
      todayIn(CATALOG_COUNTRY, now),
    );
    const inserted = await deps.library.insertProgress(
      user.id,
      episode.titleId,
      previousIds.map((id) => ({
        episodeId: id,
        watchedAt: progressDate(previousDate),
      })),
    );
    await deps.library.insertEvents(
      user.id,
      inserted.map((id) => ({
        titleId: episode.titleId,
        episodeId: id,
        watchedAt: previousDate.watchedAt,
        precision: previousDate.precision,
        source: previousDate.source,
      })),
    );
    previousMarked = inserted.length;
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

  const date = resolveWatchDate(when ?? DEFAULT_WATCH_DATE.single, deps.now());
  if (!date) return fail("INVALID_DATE", INVALID_DATE_MESSAGE);

  const mediaType = await deps.library.findTitleMediaType(titleId);
  if (!mediaType) return fail("TITLE_NOT_FOUND", "Título não encontrado.");
  if (mediaType !== "movie") {
    return fail("NOT_A_MOVIE", "Séries são marcadas por episódio.");
  }

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
  return ok({ marked: true });
}

// Apaga um registro do histórico. Se era o último do episódio, o episódio
// deixa de estar visto; se sobra algum, continua visto, com a data do
// registro mais recente que ficou. O status do título não muda sozinho.
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
    } else {
      await deps.library.refreshProgressDate(user.id, deleted.episodeId);
    }
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

  const date = resolveWatchDate(when, deps.now());
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
    return fail("NOT_WATCHED", "Marque o episódio como visto antes de rever.");
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
    return fail("NOT_WATCHED", "Marque o filme como visto antes de rever.");
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
