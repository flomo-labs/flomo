import { z } from "zod";

// Entrada de e-mail e senha (cadastro e login). O limite de 72 bytes é o do
// bcrypt, que o Supabase Auth usa: acima disso a senha seria truncada.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email());

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH)
  .refine(
    (value) => new TextEncoder().encode(value).length <= PASSWORD_MAX_BYTES,
  );

export const emailCredentialsSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type EmailCredentials = z.infer<typeof emailCredentialsSchema>;

// Senha nova digitada duas vezes (redefinir, trocar e adicionar e-mail e
// senha). A confirmação só confere se as duas são iguais.
export const newPasswordSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "PASSWORD_MISMATCH",
  });

// Pedido do link de redefinição: só o e-mail.
export const passwordResetRequestSchema = z.object({ email: emailSchema });
