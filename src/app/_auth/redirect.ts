// Destino depois do login. Só aceita caminhos do próprio site, para o
// parâmetro `next` não virar redirecionamento aberto para outro domínio.
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/")) return "/";
  const base = "http://flomo.invalid";
  try {
    const url = new URL(value, base);
    if (url.origin !== base) return "/";
    // O parser resolve `/..//x` e `/./\x` para `//x`, que o navegador lê
    // como outro site. Confere o valor que de fato será devolvido.
    const path = `${url.pathname}${url.search}${url.hash}`;
    return path.startsWith("//") ? "/" : path;
  } catch {
    return "/";
  }
}
