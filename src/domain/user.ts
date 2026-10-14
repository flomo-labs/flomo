// Usuário já autenticado pela borda (cookie ou token Bearer). Os casos de uso
// recebem este valor como parâmetro e nunca leem sessão (ADR-004).
export type AuthenticatedUser = {
  id: string;
};
