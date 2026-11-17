// Data de um comentário ("17 de nov. de 2026"). Fuso e locale fixos para o
// texto sair igual no servidor e no navegador (sem erro de hidratação) e para
// o dia não mudar conforme o aparelho de quem lê.
export function formatCommentDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "medium",
  }).format(date);
}
