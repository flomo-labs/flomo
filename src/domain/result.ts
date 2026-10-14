// Resultado de um caso de uso. Erros esperados (entrada inválida, conflito)
// voltam como valor, no formato `{ error: { code, message } }` que as bordas
// repassam (ADR-004). Exceções ficam para falhas inesperadas.
export type UseCaseError<Code extends string> = {
  code: Code;
  message: string;
};

export type Result<T, Code extends string> =
  | { ok: true; value: T }
  | { ok: false; error: UseCaseError<Code> };

export function ok<T>(value: T): { ok: true; value: T } {
  return { ok: true, value };
}

export function fail<Code extends string>(
  code: Code,
  message: string,
): { ok: false; error: UseCaseError<Code> } {
  return { ok: false, error: { code, message } };
}
