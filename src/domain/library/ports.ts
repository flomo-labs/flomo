import type { MediaType, TitleStatus } from "../catalog/types";
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
  // Escondido da lista da biblioteca (só existe com o título nela).
  hidden: boolean;
  watched: WatchedItem[];
};

// Item da fila "Seguintes": filme em Quero ver (inteiro) ou série com o
// próximo episódio a assistir.
export type FollowingItem = {
  titleId: string;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  // Nulo em filme.
  next: {
    episodeId: string;
    seasonNumber: number;
    episodeNumber: number;
    episodeName: string | null;
  } | null;
};

// Linha da biblioteca para a tela. `progress` só existe em série: episódios
// regulares já lançados e quantos o usuário viu.
export type LibraryItem = {
  titleId: string;
  mediaType: MediaType;
  status: LibraryStatus;
  title: string;
  posterPath: string | null;
  progress: { watched: number; released: number } | null;
};

export interface LibraryRepository {
  findEpisode(episodeId: string): Promise<LibraryEpisode | null>;
  findTitleMediaType(titleId: string): Promise<MediaType | null>;

  // Biblioteca do usuário, com a situação mudada mais recentemente primeiro
  // (`updated_at` de `user_titles`; marcar episódio não o altera). `statuses` nulo = todas; `hidden` escolhe entre os ocultos e os demais.
  // Título no idioma `locale`
  // (cai no título original); `today` (AAAA-MM-DD) define o que já foi lançado.
  listLibrary(
    userId: string,
    scope: { statuses: readonly LibraryStatus[] | null; hidden: boolean },
    locale: string,
    today: string,
    options?: { mediaType?: MediaType; limit?: number },
  ): Promise<LibraryItem[]>;

  // Fila "Seguintes": filmes em Quero ver e, para cada série em Assistindo ou
  // Quero ver, o primeiro episódio regular já lançado (ou sem data) depois do
  // mais avançado que o usuário viu (nada visto = o primeiro). Série em dia,
  // Pausada, Abandonada, Assistida ou oculta fica de fora. Do que subiu por
  // último para o mais antigo: o maior entre a última mudança de situação, a
  // última marcação da série e a data de exibição do episódio.
  listFollowing(
    userId: string,
    locale: string,
    today: string,
    limit: number,
  ): Promise<FollowingItem[]>;

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

  // Posição dos episódios regulares já lançados (ou sem data) que o usuário
  // ainda não viu; a tela conta os anteriores a cada episódio sem consultar
  // o banco de novo.
  listUnwatchedReleased(
    userId: string,
    titleId: string,
    today: string,
  ): Promise<{ seasonNumber: number; episodeNumber: number }[]>;

  // Grava o progresso dos episódios que ainda não estavam vistos e devolve
  // os ids dos que foram gravados agora (a PK decide em caso de corrida).
  insertProgress(
    userId: string,
    titleId: string,
    episodes: { episodeId: string; watchedAt: Date | null }[],
  ): Promise<string[]>;

  insertEvents(userId: string, events: NewWatchEvent[]): Promise<void>;

  hasMovieEvent(userId: string, titleId: string): Promise<boolean>;

  // Quanto da série o usuário viu: situação da série no catálogo, episódios
  // regulares (sem especiais) já lançados até `today` (AAAA-MM-DD) ou sem
  // data, e quantos deles o usuário viu.
  getSeriesProgress(
    userId: string,
    titleId: string,
    today: string,
  ): Promise<{ catalogStatus: TitleStatus; released: number; watched: number }>;
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
  ): Promise<{ episodeId: string | null; titleId: string } | undefined>;
  countEpisodeEvents(userId: string, episodeId: string): Promise<number>;
  deleteEpisodeProgress(userId: string, episodeId: string): Promise<void>;

  // Põe o título na biblioteca com `status` ou troca a situação atual, seja
  // qual for. Não mexe no progresso nem no histórico.
  setTitleStatus(
    userId: string,
    titleId: string,
    status: LibraryStatus,
  ): Promise<void>;
  // Esconde ou mostra o título na lista. Devolve `false` se ele não está na
  // biblioteca.
  setTitleHidden(
    userId: string,
    titleId: string,
    hidden: boolean,
  ): Promise<boolean>;
  // Tira o título da biblioteca. O progresso e o histórico ficam guardados
  // (marcar de novo traz o título de volta com eles).
  removeTitle(userId: string, titleId: string): Promise<void>;

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
