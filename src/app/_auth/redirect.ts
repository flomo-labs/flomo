// Destino depois do login. Só aceita caminhos do próprio site, para o
// parâmetro `next` não virar redirecionamento aberto para outro domínio.
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/")) return "/";
  const base = "http://flomo.invalid";
  try {
    const url = new URL(value, base);
    if (url.origin !== base) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
