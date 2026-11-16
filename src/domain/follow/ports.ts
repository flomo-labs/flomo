import type { FollowListCursor, FollowStatus } from "@/contracts/follow";

// Quem pediu para seguir o dono: nome, handle e foto são sempre visíveis,
// qualquer que seja a privacidade do perfil de quem pediu (decisão de
// 2026-11-09). `requestedAt` é quando o pedido foi feito.
export type PendingFollowRequest = {
  followerId: string;
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  requestedAt: Date;
};

// Quantos seguem o perfil e quantos ele segue (só vínculos aceitos).
export type FollowCounts = { followers: number; following: number };

// Uma pessoa de uma lista de seguidores ou de seguindo. `followedAt` é quando o
// vínculo foi criado; `cursorAt` é essa data com microssegundos, para o cursor
// da próxima página (#361). Nome, handle e foto são sempre visíveis.
export type FollowListEntry = {
  profileId: string;
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  followedAt: Date;
  cursorAt: string;
};

export type FollowRelation = {
  profileId: string;
  following: FollowStatus | null;
  followsViewer: boolean;
};

// Porta dos vínculos de seguir, implementada em infra/ (ADR-001). Dentro do
// `withUser`, o RLS limita as linhas a quem é seguidor ou seguido. O estado de
// nascimento (`accepted` ou `requested`) vem do banco, nunca do cliente.
export interface FollowRepository {
  // Cria o vínculo e devolve o estado que o banco deu. Se já existe, devolve o
  // estado atual (nunca duas linhas para o mesmo par; isso não gasta limite).
  // `not_found` se a pessoa seguida não existe; `rate_limited` se quem pede
  // passou do limite de vínculos criados em pouco tempo (o banco decide);
  // `not_configured` se o ambiente não tem limite gravado (falha fechada);
  // `blocked` se quem pede bloqueou a pessoa (o banco também recusa o
  // contrário, mas aí a resposta é `not_found`, para não revelar o bloqueio).
  insert(
    followerId: string,
    followeeId: string,
  ): Promise<
    | { status: FollowStatus }
    | "not_found"
    | "rate_limited"
    | "not_configured"
    | "blocked"
  >;

  // Deixa de seguir ou cancela a solicitação; não falha se não há vínculo.
  delete(followerId: string, followeeId: string): Promise<void>;

  // Aceita a solicitação pendente de `followerId` ao dono (`followeeId`).
  // `true` se agora é seguidor aceito (inclui quem já tinha sido aceito);
  // `false` se não há solicitação nem vínculo.
  accept(followeeId: string, followerId: string): Promise<boolean>;

  // Recusa (apaga) só solicitação pendente; não falha se não há. Quem já é
  // seguidor aceito não sai por aqui.
  decline(followeeId: string, followerId: string): Promise<void>;

  // Remove só seguidor aceito do dono (`followeeId`); solicitação pendente fica
  // (para isso há `decline`). `true` se apagou um vínculo, `false` se não havia
  // seguidor aceito. O seguidor removido pode pedir para seguir de novo.
  removeFollower(followeeId: string, followerId: string): Promise<boolean>;

  // Estado do vínculo de `followerId` com `followeeId`; `null` se não segue
  // nem pediu. Só enxerga o par quando um dos dois é o usuário logado (RLS).
  statusOf(
    followerId: string,
    followeeId: string,
  ): Promise<FollowStatus | null>;

  // Como `viewerId` se relaciona com cada pessoa de `profileIds`, numa só
  // consulta (para os botões das listas): `following` é o estado do vínculo
  // dele com ela (`null` se não segue) e `followsViewer` diz se ela o segue
  // (só aceito). Só enxerga os pares em que um dos dois é o usuário logado (RLS).
  relationsWith(
    viewerId: string,
    profileIds: string[],
  ): Promise<FollowRelation[]>;

  // Solicitações pendentes (`requested`) feitas ao dono (`followeeId`), da mais
  // recente para a mais antiga. Só devolve as do próprio dono.
  listPending(followeeId: string): Promise<PendingFollowRequest[]>;

  // Quantas solicitações pendentes o dono tem (#353): contagem barata, sem
  // trazer as linhas, para o indicador do cabeçalho.
  countPending(followeeId: string): Promise<number>;

  // Contagens de seguidores e de seguindo (só `accepted`), visíveis a qualquer
  // usuário logado, inclusive de perfil privado. `null` se o perfil não existe.
  counts(profileId: string): Promise<FollowCounts | null>;

  // Páginas das listas, do vínculo mais recente para o mais antigo. Só o dono e
  // quem o segue com solicitação aceita enxergam; para os demais volta vazio.
  listFollowers(
    profileId: string,
    page: { limit: number; after: FollowListCursor | null },
  ): Promise<FollowListEntry[]>;
  listFollowing(
    profileId: string,
    page: { limit: number; after: FollowListCursor | null },
  ): Promise<FollowListEntry[]>;
}

export type FollowDeps = { follows: FollowRepository };
