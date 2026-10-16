import type { MediaType } from "../catalog/types";
import type {
  LibraryStatus,
  WatchedAtPrecision,
  WatchEventSource,
} from "./values";

// Porta da biblioteca, implementada em infra/ (ADR-001). A implementação
// roda dentro do `withUser`, numa transação só por caso de uso: o RLS se
// aplica e cada marcação é tudo ou nada.

export type LibraryEpisode = {
  id: string;
  titleId: string;
  seasonNumber: number;
  episodeNumber: number;
};

export type NewWatchEvent = {
  titleId: string;
  episodeId: string | null;
  watchedAt: Date | null;
  precision: WatchedAtPrecision;
  source: WatchEventSource;
};

// Um item visto de um título: episódio (série) ou o próprio filme
// (`episodeId` nulo), com o registro mais recente do histórico.
export type WatchRecord = {
  eventId: string;
  watchedAt: Date | null;
  precision: WatchedAtPrecision;
};

// `eventId`, `watchedAt` e `precision` são os do registro mais recente;
// `records` traz todos, do mais recente para o mais antigo.
export type WatchedItem = WatchRecord & {
  episodeId: string | null;
  records: WatchRecord[];
};

export type TitleLibraryState = {
  // `null` quando o título não está na biblioteca.
  status: LibraryStatus | null;
  watched: WatchedItem[];
};

export interface LibraryRepository {
  findEpisode(episodeId: string): Promise<LibraryEpisode | null>;
  findTitleMediaType(titleId: string): Promise<MediaType | null>;

  // Estado do usuário num título: status e itens vistos (para as telas).
  getTitleState(userId: string, titleId: string): Promise<TitleLibraryState>;

  // Põe o título na biblioteca com `status`, ou muda o status atual quando
  // ele está em `replaceable`. Trava a linha até o fim da transação, o que
  // enfileira marcações simultâneas do mesmo título.
  upsertTitleStatus(
    userId: string,
    titleId: string,
    status: LibraryStatus,
    replaceable: readonly LibraryStatus[],
  ): Promise<void>;

  // Episódios anteriores a `episode` (temporadas regulares, sem especiais),
  // já lançados até `today` (AAAA-MM-DD) ou sem data, que o usuário ainda
  // não viu. Em ordem de exibição.
  listPreviousUnwatched(
    userId: string,
    episode: LibraryEpisode,
    today: string,
  ): Promise<string[]>;

  // Grava o progresso dos episódios que ainda não estavam vistos e devolve
  // os ids dos que foram gravados agora (a PK decide em caso de corrida).
  insertProgress(
    userId: string,
    titleId: string,
    episodes: { episodeId: string; watchedAt: Date | null }[],
  ): Promise<string[]>;

  insertEvents(userId: string, events: NewWatchEvent[]): Promise<void>;

  hasMovieEvent(userId: string, titleId: string): Promise<boolean>;
  hasEpisodeProgress(userId: string, episodeId: string): Promise<boolean>;

  // Desmarcar e apagar registros: o item continua visto enquanto sobrar
  // algum registro no histórico.
  // Registro mais recente de um episódio ou de um filme (`titleId`).
  findLatestEventId(
    userId: string,
    target: { episodeId: string } | { titleId: string },
  ): Promise<string | undefined>;
  // Apaga um registro e devolve o episódio dele (`null` para filme), ou
  // `undefined` se não existe.
  deleteEvent(
    userId: string,
    eventId: string,
  ): Promise<{ episodeId: string | null } | undefined>;
  countEpisodeEvents(userId: string, episodeId: string): Promise<number>;
  deleteEpisodeProgress(userId: string, episodeId: string): Promise<void>;

  // Troca a data de um registro do histórico e devolve o episódio dele
  // (`null` para filme), ou `undefined` se o registro não existe.
  updateEventDate(
    userId: string,
    eventId: string,
    watchedAt: Date | null,
    precision: WatchedAtPrecision,
    source: WatchEventSource,
  ): Promise<{ episodeId: string | null } | undefined>;

  // Recalcula a data do progresso do episódio a partir do histórico.
  refreshProgressDate(userId: string, episodeId: string): Promise<void>;
}
