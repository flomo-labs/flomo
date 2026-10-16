// Limite de chamadas simultâneas a um serviço externo, em memória (por
// instância do servidor). Sem fila persistente: quem passa do limite espera
// a vez (Plano v2: Catalog Gateway com limite de concorrência, sem fila).
export type Limiter = {
  run<T>(fn: () => Promise<T>): Promise<T>;
};

export function createLimiter(maxConcurrent: number): Limiter {
  if (!Number.isInteger(maxConcurrent) || maxConcurrent < 1) {
    throw new Error("O limite de concorrência precisa ser um inteiro >= 1.");
  }
  let active = 0;
  const waiting: (() => void)[] = [];

  return {
    async run(fn) {
      if (active >= maxConcurrent) {
        // A vaga é repassada diretamente por quem termina (ver `finally`).
        await new Promise<void>((resolve) => waiting.push(resolve));
      } else {
        active++;
      }
      try {
        return await fn();
      } finally {
        const next = waiting.shift();
        if (next) next();
        else active--;
      }
    },
  };
}
