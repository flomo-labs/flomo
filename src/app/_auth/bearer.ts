// Extrai o token de `Authorization: Bearer <token>` (futuro app mobile).
// Devolve null quando o cabeçalho não existe ou usa outro esquema (Basic de
// um proxy, por exemplo), e "invalid" quando diz Bearer mas está malformado.
export function parseBearerToken(
  authorization: string | null,
): string | "invalid" | null {
  if (authorization === null || !/^Bearer(\s|$)/i.test(authorization)) {
    return null;
  }
  const match = authorization.match(/^Bearer\s+(\S+)\s*$/i);
  return match ? match[1] : "invalid";
}
