import type {
  CommentListCursor,
  ModerationStatus,
} from "@/contracts/comment";
import type { LibraryRepository } from "../library/ports";

// Porta dos comentários, implementada em infra/ (ADR-001). Dentro do
// `withUser`, o RLS limita o que se grava aos comentários do próprio usuário
// e o que se lê aos que a política de leitura permite (migration 0032).

export type CommentRecord = {
  id: string;
  titleId: string;
  // No máximo um dos dois; nenhum é comentário do título.
  seasonId: string | null;
  episodeId: string | null;
  body: string;
  containsSpoilers: boolean;
  moderationStatus: ModerationStatus;
  createdAt: Date;
  // Última edição do autor; a moderação não conta.
  updatedAt: Date;
};

// Alvo de um comentário abaixo do título.
export type CommentScope = { seasonId: string } | { episodeId: string };

// Quem escreveu. `null` em `PublicComment.author` quando o perfil do autor
// não é legível ao usuário (perfil privado seguido): o comentário aparece, mas
// sem nome nem foto.
export type CommentAuthor = {
  id: string;
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
};

// Comentário de outra pessoa, já publicado. `cursorAt` é a data de criação com
// microssegundos, para o cursor da próxima página.
export type PublicComment = Omit<CommentRecord, "moderationStatus"> & {
  author: CommentAuthor | null;
  cursorAt: string;
};

export interface CommentRepository {
  insert(
    userId: string,
    titleId: string,
    scope: CommentScope | null,
    body: string,
    containsSpoilers: boolean,
  ): Promise<CommentRecord>;
  // `undefined` se o comentário não existe ou não é do usuário.
  update(
    userId: string,
    commentId: string,
    body: string,
    containsSpoilers: boolean,
  ): Promise<CommentRecord | undefined>;
  delete(userId: string, commentId: string): Promise<void>;
  // Comentários do usuário no título (de qualquer alvo), do mais recente para
  // o mais antigo.
  listMine(userId: string, titleId: string): Promise<CommentRecord[]>;
  // Título da temporada ou do episódio; `undefined` se não existe.
  findScopeTitleId(scope: CommentScope): Promise<string | undefined>;
  // Comentários publicados de outras pessoas (nunca os do `viewerId`) que o
  // usuário pode ler, do mais recente para o mais antigo. `scope` nulo traz só
  // os do próprio título. Devolve até `limit` itens a partir do cursor.
  listOthers(
    viewerId: string,
    titleId: string,
    scope: CommentScope | null,
    limit: number,
    after: CommentListCursor | null,
  ): Promise<PublicComment[]>;
}

export type CommentDeps = {
  comments: CommentRepository;
  library: Pick<LibraryRepository, "findTitleMediaType">;
};
