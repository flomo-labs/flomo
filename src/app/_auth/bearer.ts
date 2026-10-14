// Extrai o token de `Authorization: Bearer <token>` (futuro app mobile).
export function parseBearerToken(authorization: string | null): string | null {
  const match = authorization?.match(/^Bearer\s+(\S+)\s*$/i);
  return match ? match[1] : null;
}
