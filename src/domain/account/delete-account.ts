import { fail, ok, type Result } from "../result";
import type { AuthenticatedUser } from "../user";
import type { AccountRepository } from "./ports";

export type DeleteAccountErrorCode = "REAUTH_REQUIRED";

// Quanto tempo depois de entrar a exclusão ainda é aceita. Passado isso, a
// pessoa entra de novo (com Google ou, depois, senha) e confirma.
export const REAUTH_MAX_AGE_MS = 5 * 60 * 1000;

// Exclusão da própria conta: apaga o usuário e, em cascata, perfil,
// biblioteca, progresso, histórico, notas e comentários. Não tem volta, por
// isso exige uma entrada recente, além da confirmação na tela.
export async function deleteAccount(
  deps: { accounts: AccountRepository; now: () => Date },
  user: AuthenticatedUser,
  session: { signedInAt: Date | null },
): Promise<Result<null, DeleteAccountErrorCode>> {
  const { signedInAt } = session;
  if (
    !signedInAt ||
    deps.now().getTime() - signedInAt.getTime() > REAUTH_MAX_AGE_MS
  ) {
    return fail(
      "REAUTH_REQUIRED",
      "Por segurança, entre de novo na sua conta para confirmar a exclusão.",
    );
  }

  // "not_found" também é sucesso: a conta já não existe (pedido repetido).
  await deps.accounts.deleteUser(user.id);
  return ok(null);
}
