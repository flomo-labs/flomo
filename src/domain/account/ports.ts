// Porta da conta no provedor de login, implementada em infra/ (ADR-001).
// Apagar o usuário lá apaga em cascata, no banco, tudo o que é dele
// (ADR-003, seção 9).
export interface AccountRepository {
  // "not_found" se o usuário já não existe (um segundo pedido, por exemplo).
  deleteUser(userId: string): Promise<"deleted" | "not_found">;
}

// Formas de entrar numa conta. "email" é e-mail e senha.
export type SignInMethod = "google" | "email";

// Formas de entrada da pessoa logada, no provedor de login (infra/).
export interface SignInMethodsRepository {
  list(): Promise<SignInMethod[]>;
  unlink(method: SignInMethod): Promise<void>;
}
