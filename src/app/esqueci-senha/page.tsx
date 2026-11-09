import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { ForgotPasswordForm } from "../_auth/forgot-password-form";

export const metadata: Metadata = { title: "Esqueci a senha · Flomo" };

export default function EsqueciSenhaPage() {
  return (
    <main className="mx-auto flex flex-1 w-full max-w-sm flex-col justify-center gap-6 p-6">
      <BackLink fallbackHref="/entrar" />
      <ForgotPasswordForm />
    </main>
  );
}
