export type AuthMode = "signIn" | "signUp";

// `?modo=criar` abre /entrar já na aba de criar conta; qualquer outro valor
// (ou nenhum) abre na de entrar.
export function authModeFromParam(
  param: string | string[] | undefined,
): AuthMode {
  return param === "criar" ? "signUp" : "signIn";
}

// Só confere se as duas senhas digitadas são iguais. Não diz nada sobre contas
// existentes (a regra de segurança do cadastro continua no servidor).
export function passwordsMatch(
  password: string,
  confirmation: string,
): boolean {
  return password === confirmation;
}
