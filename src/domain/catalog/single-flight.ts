// Junta chamadas simultâneas com a mesma chave numa só: duas pessoas abrindo
// o mesmo título fora do cache geram uma única ida ao provedor (por
// instância do servidor; entre instâncias, quem garante é o banco).
const inFlight = new Map<string, Promise<unknown>>();

export function singleFlight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const running = inFlight.get(key);
  if (running) return running as Promise<T>;
  const promise = fn().finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}
