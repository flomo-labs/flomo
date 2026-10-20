"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type UseCaseError } from "@/domain/result";
import {
  changeHandle,
  type ChangeHandleErrorCode,
} from "@/domain/profile/change-handle";
import { withUser } from "@/infra/db/client";
import { updateProfile } from "@/domain/profile/profile-page";
import { createProfileRepository } from "@/infra/db/profile-repository";
import { safeNextPath } from "../_auth/redirect";
import { getCurrentUser } from "../_auth/session";

export type HandleFormState = {
  error?: UseCaseError<ChangeHandleErrorCode | "UNAUTHENTICATED">;
  savedHandle?: string;
  // O que foi digitado: o React limpa o formulário ao fim da ação, e o campo
  // volta com este valor.
  submitted?: string;
};

function submittedHandle(formData: FormData) {
  const value = formData.get("handle");
  return typeof value === "string" ? value : undefined;
}

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
  if (!result.ok)
    return { error: result.error, submitted: submittedHandle(formData) };
  redirect(safeNextPath(formData.get("next")));
}

// Troca a qualquer momento, nas configurações.
export async function updateHandle(
  _prev: HandleFormState,
  formData: FormData,
): Promise<HandleFormState> {
  const result = await runChangeHandle(formData);
  if (!result.ok)
    return { error: result.error, submitted: submittedHandle(formData) };
  return { savedHandle: result.value.handle, submitted: result.value.handle };
}

export type ProfileFormState = {
  error?: UseCaseError<
    "INVALID_INPUT" | "PROFILE_NOT_FOUND" | "UNAUTHENTICATED"
  >;
  saved?: boolean;
  // O que foi enviado: o React limpa o formulário ao fim da ação.
  submitted?: { displayName: string; bio: string; isPrivate: boolean };
};

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

// Nome de exibição, bio e privacidade, nas configurações.
export async function saveProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const submitted = {
    displayName: text(formData, "displayName"),
    bio: text(formData, "bio"),
    isPrivate: formData.get("isPrivate") === "on",
  };
  const user = await getCurrentUser();
  if (!user) {
    return {
      error: {
        code: "UNAUTHENTICATED",
        message: "Sua sessão expirou. Entre de novo.",
      },
      submitted,
    };
  }
  const result = await withUser(user.claims, (tx) =>
    updateProfile({ profiles: createProfileRepository(tx) }, user, submitted),
  );
  if (!result.ok) return { error: result.error, submitted };
  revalidatePath("/perfil/[handle]", "page");
  return {
    saved: true,
    submitted: {
      displayName: result.value.displayName ?? "",
      bio: result.value.bio ?? "",
      isPrivate: result.value.isPrivate,
    },
  };
}
