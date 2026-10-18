// Converte half_stars (1 a 10) para o texto exibido: 7 -> "3,5".
export function formatStars(halfStars: number): string {
  if (!Number.isInteger(halfStars) || halfStars < 1 || halfStars > 10) {
    throw new RangeError("half_stars deve ser um inteiro de 1 a 10");
  }
  return String(halfStars / 2).replace(".", ",");
}

// Média de várias notas, em meias estrelas, para o texto exibido: 7 -> "3,5",
// 6.4 -> "3,2" (uma casa decimal).
export function formatAverageStars(averageHalfStars: number): string {
  if (
    !Number.isFinite(averageHalfStars) ||
    averageHalfStars < 1 ||
    averageHalfStars > 10
  ) {
    throw new RangeError("a média deve estar entre 1 e 10 meias estrelas");
  }
  return (averageHalfStars / 2).toFixed(1).replace(".", ",");
}
