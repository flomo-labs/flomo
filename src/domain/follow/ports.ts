import type { FollowStatus } from "@/contracts/follow";

// Porta dos vínculos de seguir, implementada em infra/ (ADR-001). Dentro do
// `withUser`, o RLS limita as linhas a quem é seguidor ou seguido. O estado de
// nascimento (`accepted` ou `requested`) vem do banco, nunca do cliente.
export interface FollowRepository {
  // Cria o vínculo e devolve o estado que o banco deu. Se já existe, devolve o
  // estado atual (nunca duas linhas para o mesmo par). `not_found` se a pessoa
  // seguida não existe.
  insert(
    followerId: string,
    followeeId: string,
  ): Promise<{ status: FollowStatus } | "not_found">;

  // Deixa de seguir ou cancela a solicitação; não falha se não há vínculo.
  delete(followerId: string, followeeId: string): Promise<void>;

  // Aceita a solicitação pendente de `followerId` ao dono (`followeeId`).
  // `true` se agora é seguidor aceito (inclui quem já tinha sido aceito);
  // `false` se não há solicitação nem vínculo.
  accept(followeeId: string, followerId: string): Promise<boolean>;

  // Recusa (apaga) só solicitação pendente; não falha se não há. Quem já é
  // seguidor aceito não sai por aqui.
  decline(followeeId: string, followerId: string): Promise<void>;
}

export type FollowDeps = { follows: FollowRepository };
