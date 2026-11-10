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
