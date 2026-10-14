"use server";

import { redirect } from "next/navigation";
import type { UseCaseError } from "@/domain/result";
import {
  changeHandle,
  type ChangeHandleErrorCode,
} from "@/domain/profile/change-handle";
import { withUser } from "@/infra/db/client";
import { createProfileRepository } from "@/infra/db/profile-repository";
import { safeNextPath } from "../_auth/redirect";
import { getCurrentUser } from "../_auth/session";

export type HandleFormState = {
  error?: UseCaseError<ChangeHandleErrorCode | "UNAUTHENTICATED">;
  savedHandle?: string;
};

// Camada fina (ADR-004): resolve o usuário, chama o caso de uso e traduz o
// resultado. A regra fica em domain/profile/change-handle.ts.
async function runChangeHandle(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false as const,
      error: {
        code: "UNAUTHENTICATED" as const,
        message: "Sua sessão expirou. Entre de novo.",
      },
    };
  }
  return withUser(user.claims, (tx) =>
    changeHandle(
      { profiles: createProfileRepository(tx) },
      { id: user.id },
      { handle: formData.get("handle") },
    ),
  );
}

// Primeiro acesso: salva o handle definitivo e segue para onde o usuário ia.
export async function chooseHandle(
  _prev: HandleFormState,
  formData: FormData,
): Promise<HandleFormState> {
  const result = await runChangeHandle(formData);
  if (!result.ok) return { error: result.error };
  redirect(safeNextPath(formData.get("next")));
}

// Troca a qualquer momento, nas configurações.
export async function updateHandle(
  _prev: HandleFormState,
  formData: FormData,
): Promise<HandleFormState> {
  const result = await runChangeHandle(formData);
  if (!result.ok) return { error: result.error };
  return { savedHandle: result.value.handle };
}
