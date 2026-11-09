// Limite de usos por chave numa janela de tempo, em memória (por instância do
// servidor), como o limitador de concorrência ao lado: sem fila persistente.
// Protege a cota do provedor de catálogo contra um usuário que dispara muitas
// adições de títulos novos.
export type RateLimit = {
  // Registra um uso e devolve `false` se a chave já passou do limite.
  allow(key: string): boolean;
};

export function createRateLimit(options: {
  max: number;
  windowMs: number;
  now?: () => number;
}): RateLimit {
  const { max, windowMs } = options;
  const now = options.now ?? Date.now;
  if (!Number.isInteger(max) || max < 1 || !(windowMs > 0)) {
    throw new Error("Limite e janela precisam ser positivos.");
  }
  const hits = new Map<string, number[]>();

  return {
    allow(key) {
      const t = now();
      const recent = (hits.get(key) ?? []).filter((h) => t - h < windowMs);
      if (recent.length >= max) {
        hits.set(key, recent);
        return false;
      }
      recent.push(t);
      hits.set(key, recent);
      // Chaves paradas saem do mapa, para ele não crescer sem fim.
      if (hits.size > 1000) {
        for (const [k, list] of hits) {
          if (list.every((h) => t - h >= windowMs)) hits.delete(k);
        }
      }
      return true;
    },
  };
}
