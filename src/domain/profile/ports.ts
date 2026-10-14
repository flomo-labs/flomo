// Porta de acesso aos perfis, implementada em infra/ (ADR-001). A
// implementação roda dentro do `withUser`, então o RLS também se aplica.
export interface ProfileRepository {
  // Algum outro perfil já usa este handle na forma sem `.` nem `_`?
  // Perfis privados de outros usuários podem não aparecer por causa do RLS;
  // nesse caso quem barra é o índice único, e `updateHandle` devolve "taken".
  isHandleTaken(
    normalizedHandle: string,
    exceptUserId: string,
  ): Promise<boolean>;

  updateHandle(
    userId: string,
    handle: string,
  ): Promise<"updated" | "taken" | "not_found">;
}
