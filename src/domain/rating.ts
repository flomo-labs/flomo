// Converte half_stars (1 a 10) para o texto exibido: 7 -> "3,5".
export function formatStars(halfStars: number): string {
  if (!Number.isInteger(halfStars) || halfStars < 1 || halfStars > 10) {
    throw new RangeError("half_stars deve ser um inteiro de 1 a 10");
  }
  return String(halfStars / 2).replace(".", ",");
}
