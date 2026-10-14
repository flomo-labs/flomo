import { z } from "zod";

// Regra do handle (ADR-003, seção 6). O banco garante o formato e a unicidade;
// nomes reservados e o prefixo `u_` só são barrados aqui.
export const HANDLE_MIN_LENGTH = 5;
export const HANDLE_MAX_LENGTH = 20;

// Letras minúsculas e números, separados por um único `.` ou `_`.
const HANDLE_FORMAT = /^[a-z0-9]+([._][a-z0-9]+)*$/;

// Handles provisórios criados pelo trigger de cadastro.
const PROVISIONAL_PREFIX = "u_";

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
  .refine((handle) => !handle.startsWith(PROVISIONAL_PREFIX), {
    message: `O nome de usuário não pode começar com "${PROVISIONAL_PREFIX}".`,
  })
  .refine((handle) => !RESERVED_HANDLES.includes(normalizeHandle(handle)), {
    message: "Este nome de usuário é reservado.",
  });

export type Handle = z.infer<typeof handleSchema>;
