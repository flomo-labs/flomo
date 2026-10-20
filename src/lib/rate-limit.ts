// Limite por chave (IP) em janela fixa, na memória da instância. Na Vercel
// cada instância conta por conta própria, então é um freio parcial: o corte
// firme fica na regra de rate limit da Vercel (docs/deploy.md).
export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

export function createRateLimiter({
  limit,
  windowMs,
  maxKeys,
}: {
  limit: number;
  windowMs: number;
  maxKeys: number;
}) {
  const windows = new Map<string, { start: number; count: number }>();

  function prune(now: number) {
    for (const [key, window] of windows) {
      if (now - window.start >= windowMs) windows.delete(key);
    }
    // Ainda cheio depois de limpar os vencidos: descarta os mais antigos
    // (o Map guarda a ordem de inserção).
    for (const key of windows.keys()) {
      if (windows.size < maxKeys) break;
      windows.delete(key);
    }
  }

  return function check(key: string, now: number): RateLimitResult {
    let window = windows.get(key);
    if (!window || now - window.start >= windowMs) {
      if (windows.size >= maxKeys) prune(now);
      window = { start: now, count: 0 };
      windows.set(key, window);
    }
    window.count += 1;
    return {
      allowed: window.count <= limit,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((window.start + windowMs - now) / 1000),
      ),
    };
  };
}
