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

// Entradas dos casos de uso de comentário (Fase 1.5).
export const createCommentInputSchema = z.object({
  titleId: z.uuid(),
  body: commentBodySchema,
  containsSpoilers: z.boolean().default(false),
});

export const updateCommentInputSchema = z.object({
  commentId: z.uuid(),
  body: commentBodySchema,
  containsSpoilers: z.boolean().default(false),
});

export const deleteCommentInputSchema = z.object({ commentId: z.uuid() });

export const listMyCommentsInputSchema = z.object({ titleId: z.uuid() });
