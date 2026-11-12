// Quanto tempo depois de entrar a tela de senha nova (aberta pelo link do
// e-mail de redefinição) ainda aceita a troca. O link abre a sessão na hora; uma
// sessão mais antiga não prova que quem está nela recebeu o e-mail, e trocar a
// senha sem conhecer a atual daria a quem roubou a sessão uma entrada que
// sobrevive ao encerramento dela.
export const RESET_PASSWORD_MAX_AGE_MS = 10 * 60 * 1000;

export function isRecentSignIn(
  signedInAt: Date | null,
  now: Date,
  maxAgeMs: number,
): boolean {
  if (!signedInAt) return false;
  const age = now.getTime() - signedInAt.getTime();
  return age <= maxAgeMs;
}
