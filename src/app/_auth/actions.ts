"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  emailCredentialsSchema,
  emailSchema,
  newPasswordSchema,
  passwordResetRequestSchema,
} from "@/contracts/credentials";
import { unlinkSignInMethod } from "@/domain/account/unlink-sign-in-method";
import type { EmailAuthFailure } from "@/infra/auth/supabase";
import { destinationAfterLogin } from "../_profile/queries";
import { RESET_PASSWORD_PATH, safeNextPath } from "./redirect";
import { resolveSiteUrl } from "./site-url";
import {
  getCurrentUser,
  getRequestAuth,
  requireUser,
  toCurrentUser,
} from "./session";

async function siteUrl() {
  const requestHeaders = await headers();
  const url = resolveSiteUrl(
    process.env,
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
  );
  if (!url) {
    throw new Error(
      "URL do site indefinida: defina NEXT_PUBLIC_SITE_URL em Production e no .env.local.",
    );
  }
  return url;
}

async function startGoogleSignIn(
  formData: FormData,
  options: { selectAccount?: boolean } = {},
) {
  const callback = new URL("/auth/callback", await siteUrl());
  const next = safeNextPath(formData.get("next"));
  callback.searchParams.set("next", next);

  const auth = await getRequestAuth();
  const googleUrl = await auth.startGoogleSignIn(callback.toString(), options);
  redirect(googleUrl ?? `/entrar?erro=google&next=${encodeURIComponent(next)}`);
}

// Inicia o login com Google. A volta é em /auth/callback.
export async function signInWithGoogle(formData: FormData) {
  await startGoogleSignIn(formData);
}

// Nova entrada de quem já está logado, antes de uma ação sem volta (excluir a
// conta): o Google mostra a escolha de conta, e a volta segue para `next`.
export async function reauthenticateWithGoogle(formData: FormData) {
  await startGoogleSignIn(formData, { selectAccount: true });
}

export type PasswordReauthState = {
  error?: "INVALID_PASSWORD" | "RATE_LIMITED" | "UNAUTHENTICATED" | "UNKNOWN";
};

// Nova entrada com senha de quem já está logado, antes de excluir a conta. O
// e-mail vem sempre da sessão, nunca do formulário: a ação só confirma a
// senha de quem está logado e não revela nada sobre outros e-mails.
export async function reauthenticateWithPassword(
  password: string,
): Promise<PasswordReauthState> {
  const user = await getCurrentUser();
  const email = user?.claims.email;
  if (typeof email !== "string") return { error: "UNAUTHENTICATED" };
  if (typeof password !== "string" || password.length === 0) {
    return { error: "INVALID_PASSWORD" };
  }

  const auth = await getRequestAuth();
  const result = await auth.signInWithEmail(email, password);
  if (result.ok) return {};
  switch (result.code) {
    case "INVALID_CREDENTIALS":
      return { error: "INVALID_PASSWORD" };
    case "RATE_LIMITED":
      return { error: "RATE_LIMITED" };
    default:
      return { error: "UNKNOWN" };
  }
}

export async function signOut() {
  const auth = await getRequestAuth();
  await auth.signOut();
  redirect("/");
}

export type EmailFormState = {
  error?: EmailAuthFailure | "INVALID_INPUT";
  // Cadastro feito: falta abrir o link enviado ao e-mail.
  confirmationSent?: boolean;
};

async function submitEmailForm(
  formData: FormData,
  mode: "signUp" | "signIn",
): Promise<EmailFormState> {
  const parsed = emailCredentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  // No login, uma senha fora das regras de cadastro só pode estar errada.
  if (!parsed.success) {
    return {
      error: mode === "signIn" ? "INVALID_CREDENTIALS" : "INVALID_INPUT",
    };
  }

  const auth = await getRequestAuth();
  const { email, password } = parsed.data;
  const next = safeNextPath(formData.get("next"));
  let callback: URL | null = null;
  if (mode === "signUp") {
    callback = new URL("/auth/callback", await siteUrl());
    callback.searchParams.set("next", next);
  }
  const result = callback
    ? await auth.signUpWithEmail(email, password, callback.toString())
    : await auth.signInWithEmail(email, password);
  // E-mail já cadastrado vira a mesma resposta do cadastro novo: a tela não
  // revela se o e-mail tem conta.
  if (!result.ok) {
    return result.code === "EMAIL_TAKEN" && mode === "signUp"
      ? { confirmationSent: true }
      : { error: result.code };
  }
  if ("pending" in result) return { confirmationSent: true };

  const user = toCurrentUser(result.claims);
  redirect(user ? await destinationAfterLogin(user, next) : next);
}

// Cadastro com e-mail e senha. Formato de `useActionState`.
export async function signUpWithEmail(
  _previous: EmailFormState,
  formData: FormData,
): Promise<EmailFormState> {
  return submitEmailForm(formData, "signUp");
}

export async function signInWithEmail(
  _previous: EmailFormState,
  formData: FormData,
): Promise<EmailFormState> {
  return submitEmailForm(formData, "signIn");
}

// Vincula o Google a uma conta que entrou por e-mail. A volta é em
// /auth/callback, que troca o código como num login comum.
export async function linkGoogle() {
  await requireUser("/configuracoes");
  const callback = new URL("/auth/callback", await siteUrl());
  callback.searchParams.set("next", "/configuracoes");

  const auth = await getRequestAuth();
  const googleUrl = await auth.startGoogleLink(callback.toString());
  redirect(googleUrl ?? "/configuracoes?erro=vinculo");
}

export type UnlinkFormState = { error?: "NOT_LINKED" | "LAST_METHOD" };

// Desvincula o Google. A regra de ouro (nunca ficar sem forma de entrar)
// fica no caso de uso.
export async function unlinkGoogle(): Promise<UnlinkFormState> {
  await requireUser("/configuracoes");
  const auth = await getRequestAuth();
  const result = await unlinkSignInMethod(
    { methods: auth.signInMethods() },
    "google",
  );
  return result.ok ? {} : { error: result.error.code };
}

export type PasswordResetRequestState = {
  error?: "INVALID_INPUT" | "RATE_LIMITED" | "UNKNOWN";
  // Pedido aceito. A tela é a mesma exista a conta ou não.
  sent?: boolean;
};

// Pede o link de redefinição. O link volta em /auth/callback, que abre a
// sessão e leva a /redefinir-senha. A resposta nunca revela se o e-mail tem
// conta: só o formato inválido e o limite de envios aparecem.
export async function requestPasswordReset(
  _previous: PasswordResetRequestState,
  formData: FormData,
): Promise<PasswordResetRequestState> {
  const parsed = passwordResetRequestSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) return { error: "INVALID_INPUT" };

  const callback = new URL("/auth/callback", await siteUrl());
  callback.searchParams.set("next", RESET_PASSWORD_PATH);
  const auth = await getRequestAuth();
  const result = await auth.requestPasswordReset(
    parsed.data.email,
    callback.toString(),
  );
  if (result.ok) return { sent: true };
  return { error: result.code === "RATE_LIMITED" ? "RATE_LIMITED" : "UNKNOWN" };
}

export type NewPasswordState = {
  error?:
    | "INVALID_PASSWORD"
    | "PASSWORD_MISMATCH"
    | "SAME_PASSWORD"
    | "RATE_LIMITED"
    | "UNAUTHENTICATED"
    | "UNKNOWN";
};

function newPasswordInput(password: unknown, confirmPassword: unknown) {
  const parsed = newPasswordSchema.safeParse({ password, confirmPassword });
  if (parsed.success) return { password: parsed.data.password };
  const mismatch = parsed.error.issues.some(
    (issue) => issue.message === "PASSWORD_MISMATCH",
  );
  return {
    error: (mismatch ? "PASSWORD_MISMATCH" : "INVALID_PASSWORD") as
      | "PASSWORD_MISMATCH"
      | "INVALID_PASSWORD",
  };
}

async function savePassword(password: string): Promise<NewPasswordState> {
  const auth = await getRequestAuth();
  const result = await auth.updatePassword(password);
  if (result.ok) return {};
  switch (result.code) {
    case "WEAK_PASSWORD":
      return { error: "INVALID_PASSWORD" };
    case "SAME_PASSWORD":
      return { error: "SAME_PASSWORD" };
    case "RATE_LIMITED":
      return { error: "RATE_LIMITED" };
    default:
      return { error: "UNKNOWN" };
  }
}

// Define a senha nova na sessão aberta pelo link do e-mail (a volta de
// /auth/callback). Sem sessão, o link venceu ou já foi usado. Formato de
// `useActionState`.
export async function resetPassword(
  _previous: NewPasswordState,
  formData: FormData,
): Promise<NewPasswordState> {
  const user = await getCurrentUser();
  if (!user) return { error: "UNAUTHENTICATED" };
  const input = newPasswordInput(
    formData.get("password"),
    formData.get("confirmPassword"),
  );
  if (input.error) return { error: input.error };

  const saved = await savePassword(input.password);
  if (saved.error) return saved;
  redirect(await destinationAfterLogin(user, "/"));
}

// Troca a senha de quem está logado com e-mail e senha. A senha atual é
// conferida pelo servidor, com o e-mail da sessão (nunca do formulário).
export async function changePassword(
  currentPassword: string,
  password: string,
  confirmPassword: string,
): Promise<NewPasswordState> {
  const input = newPasswordInput(password, confirmPassword);
  if (input.error) return { error: input.error };
  const current = await reauthenticateWithPassword(currentPassword);
  if (current.error) {
    return {
      error:
        current.error === "INVALID_PASSWORD"
          ? "INVALID_PASSWORD"
          : current.error,
    };
  }
  return savePassword(input.password);
}

export type AddEmailState = {
  error?:
    | "INVALID_EMAIL"
    | "INVALID_PASSWORD"
    | "PASSWORD_MISMATCH"
    | "RATE_LIMITED"
    | "UNAUTHENTICATED"
    | "UNKNOWN";
  // E-mail de confirmação enviado: a forma de entrar só vale depois do link.
  sent?: boolean;
};

// Conta que entrou só pelo Google: define e-mail (pode ser outro) e senha.
// A volta do link de confirmação é /configuracoes.
export async function addEmailAndPassword(
  email: string,
  password: string,
  confirmPassword: string,
): Promise<AddEmailState> {
  const user = await getCurrentUser();
  if (!user) return { error: "UNAUTHENTICATED" };
  const parsedEmail = emailSchema.safeParse(email);
  if (!parsedEmail.success) return { error: "INVALID_EMAIL" };
  const input = newPasswordInput(password, confirmPassword);
  if (input.error) return { error: input.error };

  const callback = new URL("/auth/callback", await siteUrl());
  callback.searchParams.set("next", "/configuracoes");
  const auth = await getRequestAuth();
  const result = await auth.addEmailAndPassword(
    parsedEmail.data,
    input.password,
    callback.toString(),
  );
  if (result.ok) return { sent: true };
  switch (result.code) {
    case "WEAK_PASSWORD":
      return { error: "INVALID_PASSWORD" };
    case "RATE_LIMITED":
      return { error: "RATE_LIMITED" };
    default:
      return { error: "UNKNOWN" };
  }
}
