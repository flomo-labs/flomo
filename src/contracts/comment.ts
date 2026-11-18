import { z } from "zod";

// Comentário: texto do usuário sobre um título (várias por usuário e título).
// O limite vale aqui e no CHECK da tabela `comments`: mudar um exige mudar o
// outro (no banco, por uma migration nova).
export const COMMENT_MAX_LENGTH = 5000;

// Situação de moderação. Só a plataforma muda; o autor não (trigger da
// migration 0009).
export const MODERATION_STATUSES = ["published", "hidden", "removed"] as const;

export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

// Texto do comentário. O banco conta caracteres (não unidades UTF-16) e exige
// ao menos um que não seja espaço ou quebra de linha: `[...s].length` conta
// como ele, e o espaço de linha seguinte (U+0085) entra à parte porque o `\s`
// do JavaScript não o inclui. As pontas em branco são cortadas antes de
// gravar.
export const commentBodySchema = z
  .string()
  .trim()
  .refine((s) => /[^\s\u0085]/.test(s), {
    message: "Escreva o comentário.",
  })
  .refine((s) => [...s].length <= COMMENT_MAX_LENGTH, {
    message: `O comentário pode ter até ${COMMENT_MAX_LENGTH} caracteres.`,
  });

// Alvo do comentário: o título (sem os dois campos), uma temporada ou um
// episódio, nunca os dois (CHECK `comments_season_or_episode`, migration 0032).
const SEASON_OR_EPISODE = {
  message: "Escolha só a temporada ou só o episódio.",
};
const atMostOneTarget = (v: { seasonId?: string; episodeId?: string }) =>
  !(v.seasonId && v.episodeId);

// Entradas dos casos de uso de comentário (Fases 1.5 e 2.1b). `seasonId` e
// `episodeId` são do mesmo título de `titleId`; o banco grava sempre o título
// da temporada ou do episódio.
export const createCommentInputSchema = z
  .object({
    titleId: z.uuid(),
    seasonId: z.uuid().optional(),
    episodeId: z.uuid().optional(),
    body: commentBodySchema,
    containsSpoilers: z.boolean().default(false),
  })
  .refine(atMostOneTarget, SEASON_OR_EPISODE);

export const updateCommentInputSchema = z.object({
  commentId: z.uuid(),
  body: commentBodySchema,
  containsSpoilers: z.boolean().default(false),
});

export const deleteCommentInputSchema = z.object({ commentId: z.uuid() });

// Curtir e descurtir um comentário (#396).
export const likeCommentInputSchema = z.object({ commentId: z.uuid() });

export const listMyCommentsInputSchema = z.object({ titleId: z.uuid() });

// Comentários de outras pessoas, em páginas. Sem `seasonId` nem `episodeId`,
// vêm só os do próprio título; com um deles, só os daquela temporada ou
// daquele episódio.
export const COMMENT_LIST_DEFAULT_PAGE_SIZE = 20;
export const COMMENT_LIST_MAX_PAGE_SIZE = 50;

// Cursor: data do último comentário entregue, com microssegundos (o formato
// que o banco devolve em `cursor_at`; um `Date` os perderia), e o id, que
// desempata datas iguais.
export const commentListCursorSchema = z.object({
  at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/)
    // Data impossível (mês 99) passaria no formato e o Postgres a recusaria.
    .refine((s) => !Number.isNaN(Date.parse(s.replace(/\.\d{6}Z$/, "Z")))),
  id: z.uuid(),
});

export type CommentListCursor = z.infer<typeof commentListCursorSchema>;

export const listTitleCommentsInputSchema = z
  .object({
    titleId: z.uuid(),
    seasonId: z.uuid().optional(),
    episodeId: z.uuid().optional(),
    limit: z
      .number()
      .int()
      .min(1)
      .max(COMMENT_LIST_MAX_PAGE_SIZE)
      .default(COMMENT_LIST_DEFAULT_PAGE_SIZE),
    // `null` é a primeira página.
    after: commentListCursorSchema.nullable().default(null),
  })
  .refine(atMostOneTarget, SEASON_OR_EPISODE);
