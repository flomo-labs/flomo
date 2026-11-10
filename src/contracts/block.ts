import { z } from "zod";

// Entradas dos casos de uso de bloqueio (Fase 2.1). `profileId` é a pessoa que
// se quer bloquear (ou desbloquear).
export const blockInputSchema = z.object({ profileId: z.uuid() });

export const unblockInputSchema = z.object({ profileId: z.uuid() });
