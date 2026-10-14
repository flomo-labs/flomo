import { z } from "zod";

// Regra do handle (ADR-003, seção 6). O banco garante o formato e a unicidade;
// nomes reservados e o prefixo `u_` só são barrados aqui.
export const HANDLE_MIN_LENGTH = 5;
export const HANDLE_MAX_LENGTH = 20;

// Letras minúsculas e números, separados por um único `.` ou `_`.
const HANDLE_FORMAT = /^[a-z0-9]+([._][a-z0-9]+)*$/;

// Handles provisórios criados pelo trigger de cadastro: `u_` + 12 caracteres
// hexadecimais. Como a unicidade ignora os separadores, também é barrada
// qualquer forma que, sem eles, fique igual a um provisório (`u.0a1b...`).
const PROVISIONAL_PREFIX = "u_";
const PROVISIONAL_NORMALIZED = /^u[0-9a-f]{12}$/;
const PROVISIONAL_HANDLE = /^u_[0-9a-f]{12}$/;

// O usuário ainda não escolheu o handle definitivo (primeiro acesso).
export function isProvisionalHandle(handle: string): boolean {
  return PROVISIONAL_HANDLE.test(handle);
}

// Comparados na forma sem separadores (`ad.min` = `admin`). Nomes com menos
// de 5 caracteres (api, app, www...) já são barrados pelo tamanho.
export const RESERVED_HANDLES: readonly string[] = [
  "admin",
  "administrador",
  "ajuda",
  "cadastro",
  "callback",
  "config",
  "configuracoes",
  "conta",
  "embreve",
  "entrar",
  "explorar",
  "flomo",
  "login",
  "logout",
  "moderacao",
  "moderador",
  "oauth",
  "perfil",
  "privacidade",
  "settings",
  "signin",
  "signup",
  "sobre",
  "suporte",
  "support",
  "termos",
];

// Forma usada na unicidade: sem `.` nem `_` (igual ao índice do banco).
export function normalizeHandle(handle: string): string {
  return handle.replace(/[._]/g, "");
}

// Handle escolhido pelo usuário. Aceita maiúsculas e espaços nas pontas e
// devolve a forma normalizada (minúsculas).
export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(
    HANDLE_MIN_LENGTH,
    `O nome de usuário precisa ter pelo menos ${HANDLE_MIN_LENGTH} caracteres.`,
  )
  .max(
    HANDLE_MAX_LENGTH,
    `O nome de usuário pode ter no máximo ${HANDLE_MAX_LENGTH} caracteres.`,
  )
  .regex(
    HANDLE_FORMAT,
    "Use letras, números, ponto ou sublinhado, começando e terminando com letra ou número, sem dois separadores seguidos.",
  )
  .refine(
    (handle) =>
      !handle.startsWith(PROVISIONAL_PREFIX) &&
      !PROVISIONAL_NORMALIZED.test(normalizeHandle(handle)),
    { message: "Este formato é reservado aos nomes de usuário provisórios." },
  )
  .refine((handle) => !RESERVED_HANDLES.includes(normalizeHandle(handle)), {
    message: "Este nome de usuário é reservado.",
  });

export type Handle = z.infer<typeof handleSchema>;

// Entrada do caso de uso de escolha e troca do handle.
export const changeHandleInputSchema = z.object({ handle: handleSchema });

export type ChangeHandleInput = z.infer<typeof changeHandleInputSchema>;
