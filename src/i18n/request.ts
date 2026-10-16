import { getRequestConfig } from "next-intl/server";

// Só pt-BR por enquanto, sem roteamento por idioma (Plano v2): o idioma é
// fixo e as mensagens ficam em src/messages. Novo idioma = novo arquivo aqui e
// uma regra para escolher o locale (cookie/conta), sem mexer nas páginas.
export const DEFAULT_LOCALE = "pt-BR";

export default getRequestConfig(async () => ({
  locale: DEFAULT_LOCALE,
  messages: (await import("../messages/pt-BR.json")).default,
}));
