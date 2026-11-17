import { z } from "zod";

// Listas do Descobrir que o usuário pode reordenar e ocultar (Fase 2.10, #111).
// Os ids são estáveis: nunca mudam de significado, e uma lista nova entra aqui
// sem migration. A ordem desta constante é a ordem padrão da tela.
export const DISCOVER_LIST_IDS = ["trending", "now_playing"] as const;

export const discoverListIdSchema = z.enum(DISCOVER_LIST_IDS);
export type DiscoverListId = z.infer<typeof discoverListIdSchema>;

// Sem repetição de id. Tamanho máximo igual ao do CHECK do banco (a lista fixa
// nunca chega perto).
export const DISCOVER_PREFERENCES_MAX_ITEMS = 50;

// Lê o que está salvo: id que não existe mais (lista retirada) é ignorado e
// repetição some; nada disso derruba a tela.
const storedIdsSchema = z
  .array(z.string())
  .transform((ids) => [
    ...new Set(
      ids.filter((id): id is DiscoverListId =>
        (DISCOVER_LIST_IDS as readonly string[]).includes(id),
      ),
    ),
  ]);

export const storedDiscoverPreferencesSchema = z.object({
  order: storedIdsSchema,
  hidden: storedIdsSchema,
});

// Grava: só ids conhecidos e sem repetição (entrada do usuário, mais estrita
// que a leitura).
const idsToSaveSchema = z
  .array(discoverListIdSchema)
  .max(DISCOVER_PREFERENCES_MAX_ITEMS)
  .refine((ids) => new Set(ids).size === ids.length, {
    message: "ids repetidos",
  });

export const saveDiscoverPreferencesInputSchema = z.object({
  order: idsToSaveSchema,
  hidden: idsToSaveSchema,
});

export type DiscoverPreferences = {
  order: DiscoverListId[];
  hidden: DiscoverListId[];
};

// Ordem final das listas: as da preferência na ordem salva, e as que a
// preferência não conhece (lista nova) no fim, na ordem padrão.
export function resolveDiscoverOrder(order: readonly DiscoverListId[]) {
  const known = [...new Set(order)].filter((id) =>
    DISCOVER_LIST_IDS.includes(id),
  );
  const rest = DISCOVER_LIST_IDS.filter((id) => !known.includes(id));
  return [...known, ...rest];
}
