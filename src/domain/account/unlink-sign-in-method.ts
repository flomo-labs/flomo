import { fail, ok, type Result } from "../result";
import type { SignInMethod, SignInMethodsRepository } from "./ports";

export type UnlinkSignInMethodErrorCode = "NOT_LINKED" | "LAST_METHOD";

// Desvincula uma forma de entrar. Regra de ouro: a conta nunca fica sem
// nenhuma forma de entrar. A lista é lida na hora, do provedor de login, e
// não do que a tela mostrava.
export async function unlinkSignInMethod(
  deps: { methods: SignInMethodsRepository },
  method: SignInMethod,
): Promise<Result<null, UnlinkSignInMethodErrorCode>> {
  const linked = await deps.methods.list();

  if (!linked.includes(method)) {
    return fail("NOT_LINKED", "Essa forma de entrar não está vinculada.");
  }
  if (linked.length <= 1) {
    return fail(
      "LAST_METHOD",
      "Essa é a sua única forma de entrar. Adicione outra antes de remover.",
    );
  }

  await deps.methods.unlink(method);
  return ok(null);
}
