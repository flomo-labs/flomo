"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  deleteAccount,
  type DeleteAccountErrorCode,
} from "@/domain/account/delete-account";
import { type UseCaseError } from "@/domain/result";
import { createAccountRepository, signedInAt } from "@/infra/auth/supabase";
import { getCurrentUser, getRequestAuth } from "../_auth/session";

export type DeleteAccountFormState = {
  error?: UseCaseError<DeleteAccountErrorCode | "UNAUTHENTICATED">;
};

// Camada fina (ADR-004): resolve o usuário, chama o caso de uso e, se deu
// certo, encerra a sessão e vai para a landing. A regra fica em
// domain/account/delete-account.ts. Com REAUTH_REQUIRED, a tela oferece a
// nova entrada (`reauthenticateWithGoogle`, com `next` de volta para cá).
export async function deleteOwnAccount(): Promise<DeleteAccountFormState> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      error: {
        code: "UNAUTHENTICATED",
        message: "Sua sessão expirou. Entre de novo.",
      },
    };
  }

  const result = await deleteAccount(
    { accounts: createAccountRepository(), now: () => new Date() },
    user,
    { signedInAt: signedInAt(user.claims) },
  );
  if (!result.ok) return { error: result.error };

  // O usuário já não existe: o Supabase recusa o token, e o signOut só
  // limpa os cookies deste navegador.
  const auth = await getRequestAuth();
  await auth.signOut();
  // O perfil público sai do cache junto com a conta.
  revalidatePath("/perfil/[handle]", "page");
  redirect("/");
}
