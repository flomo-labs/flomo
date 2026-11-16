import { z } from "zod";

// Estado de um vínculo de seguir (tabela `follows`, CHECK da migration 0021):
// `requested` é a solicitação pendente de perfil privado; `accepted` é quem
// já segue. Mudar um exige mudar o outro (no banco, por uma migration nova).
export const FOLLOW_STATUSES = ["requested", "accepted"] as const;

export type FollowStatus = (typeof FOLLOW_STATUSES)[number];

// Entradas dos casos de uso de seguir (Fase 2.1). `profileId` é a pessoa que
// se quer seguir (ou deixar de seguir); `followerId` é quem pediu para seguir
// o dono, nas ações de aceitar e recusar.
export const followInputSchema = z.object({ profileId: z.uuid() });

export const unfollowInputSchema = z.object({ profileId: z.uuid() });

export const acceptFollowInputSchema = z.object({ followerId: z.uuid() });

export const declineFollowInputSchema = z.object({ followerId: z.uuid() });

export const removeFollowerInputSchema = z.object({ followerId: z.uuid() });

// Páginas das listas de seguidores e de seguindo. O banco limita a página a
// FOLLOW_LIST_MAX_PAGE_SIZE (função `app.followers_of`, migrations 0023 e 0028).
export const FOLLOW_LIST_DEFAULT_PAGE_SIZE = 30;
export const FOLLOW_LIST_MAX_PAGE_SIZE = 100;

// Cursor das listas (#361): data do vínculo do último item entregue, com
// microssegundos (o formato que o banco devolve em `cursor_at`; um `Date` os
// perderia), e o id da pessoa, que desempata datas iguais.
export const followListCursorSchema = z.object({
  at: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/),
  id: z.uuid(),
});

export type FollowListCursor = z.infer<typeof followListCursorSchema>;

export const followCountsInputSchema = z.object({ profileId: z.uuid() });

export const followListInputSchema = z.object({
  profileId: z.uuid(),
  limit: z
    .number()
    .int()
    .min(1)
    .max(FOLLOW_LIST_MAX_PAGE_SIZE)
    .default(FOLLOW_LIST_DEFAULT_PAGE_SIZE),
  // `null` é a primeira página.
  after: followListCursorSchema.nullable().default(null),
});

// Rolagem infinita das listas de seguidores e de seguindo: `after` é o cursor
// do último item que a tela recebeu.
export const loadMorePeopleInputSchema = z.object({
  profileId: z.uuid(),
  kind: z.enum(["followers", "following"]),
  after: followListCursorSchema,
});
