// Iniciais do avatar: primeira letra da primeira e da última palavra do nome
// de exibição ("Maria Souza" → "MS", "Maria" → "M"). Sem nome, as duas
// primeiras letras do @usuário; sem nenhum dos dois, "?".
export function profileInitials(
  displayName: string | null | undefined,
  handle: string | null | undefined,
): string {
  const words = (displayName ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length > 0) {
    const first = [...words[0]][0];
    const last = words.length > 1 ? [...words[words.length - 1]][0] : "";
    return (first + last).toUpperCase();
  }
  const fallback = [...(handle ?? "").trim()].slice(0, 2).join("");
  return fallback ? fallback.toUpperCase() : "?";
}
