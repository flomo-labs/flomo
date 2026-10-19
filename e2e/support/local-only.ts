// O E2E cria usuários com senha e grava títulos falsos no cache do catálogo.
// Para não fazer isso no flomo-dev ou na produção por esquecimento (o
// `.env.local` aponta para lá), só roda com Supabase e banco locais.
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function assertLocalEnv(names: readonly string[]) {
  for (const name of names) {
    const value = process.env[name];
    let host: string | undefined;
    try {
      host = value ? new URL(value).hostname : undefined;
    } catch {
      host = undefined;
    }
    if (!host || !LOCAL_HOSTS.has(host)) {
      throw new Error(
        `${name} precisa apontar para o Supabase local (localhost). Veja e2e/README.md.`,
      );
    }
  }
}
