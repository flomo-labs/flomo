// Pessoa bloqueada por quem pergunta: nome, handle e foto são os únicos dados
// visíveis, qualquer que seja a privacidade do perfil bloqueado (decisão de
// 2026-11-10). `blockedAt` é quando o bloqueio foi criado.
export type BlockedPerson = {
  profileId: string;
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  blockedAt: Date;
};

// Porta dos bloqueios, implementada em infra/ (ADR-001). Dentro do `withUser`,
// o RLS só deixa enxergar e mexer nos bloqueios de quem bloqueou.
export interface BlockRepository {
  // Cria o bloqueio (o banco remove o vínculo de seguir nos dois sentidos).
  // Se já existe, não faz nada. `not_found` se a pessoa não existe.
  insert(blockerId: string, blockedId: string): Promise<"ok" | "not_found">;

  // Desfaz o bloqueio; não falha se não há. Não restaura o vínculo de seguir.
  delete(blockerId: string, blockedId: string): Promise<void>;

  // `blockerId` bloqueou `blockedId`? Só enxerga os bloqueios do próprio
  // usuário logado (RLS).
  exists(blockerId: string, blockedId: string): Promise<boolean>;

  // Quem o usuário logado bloqueou, do bloqueio mais recente para o mais
  // antigo.
  list(blockerId: string): Promise<BlockedPerson[]>;
}

export type BlockDeps = { blocks: BlockRepository };
