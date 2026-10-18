import type { ModerationStatus } from "@/contracts/comment";
import type { LibraryRepository } from "../library/ports";

// Porta dos comentários, implementada em infra/ (ADR-001). Dentro do
// `withUser`, o RLS limita o que se lê e grava aos comentários do próprio
// usuário.

export type CommentRecord = {
  id: string;
  titleId: string;
  body: string;
  containsSpoilers: boolean;
  moderationStatus: ModerationStatus;
  createdAt: Date;
  // Última edição do autor; a moderação não conta.
  updatedAt: Date;
};

export interface CommentRepository {
  insert(
    userId: string,
    titleId: string,
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
  // Comentários do usuário no título, do mais recente para o mais antigo.
  listMine(userId: string, titleId: string): Promise<CommentRecord[]>;
}

export type CommentDeps = {
  comments: CommentRepository;
  library: Pick<LibraryRepository, "findTitleMediaType">;
};
