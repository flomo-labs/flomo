import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/app/_auth/session";
import { loadProfilePage, profilePath } from "@/app/_profile/queries";
import { BackLink } from "@/components/back-link";
import { InfinitePersonList } from "@/components/follow/infinite-person-list";
import { followButtonLabels, removeFollowerLabels } from "./labels";
import { loadFollowList, type FollowListKind } from "./queries";

// Páginas /@handle/seguidores e /@handle/seguindo: a lista do vínculo mais
// recente ao mais antigo, com rolagem infinita (30 por vez; o primeiro trecho
// vem do servidor). Quem não pode ver a lista (perfil privado sem solicitação
// aceita) lê o aviso, não a lista.
export async function FollowListPage({
  kind,
  handle,
}: {
  kind: FollowListKind;
  handle: string;
}) {
  const user = await requireUser(
    `${profilePath(handle)}/${kind === "followers" ? "seguidores" : "seguindo"}`,
  );
  const result = await loadProfilePage(user, handle);
  if (!result.ok) notFound();
  const { profile } = result.value;
  const tf = await getTranslations("seguidores");
  const name = profile.displayName ?? `@${profile.handle}`;
  const list = profile.canSeeDetails
    ? await loadFollowList(user, profile.id, kind, null)
    : null;
  // Só o dono remove seguidor, e só na lista de seguidores dele.
  const canRemove = kind === "followers" && profile.id === user.id;

  return (
    <div className="flex max-w-reading flex-col gap-6">
      <header className="flex items-center gap-3">
        <BackLink fallbackHref={profilePath(profile.handle)} variant="icon" />
        <h1 className="text-2xl font-bold break-words">
          {tf(kind === "followers" ? "followersTitle" : "followingTitle")}
        </h1>
      </header>
      {list === null ? (
        <p className="text-muted-foreground">{tf("listLocked", { name })}</p>
      ) : (
        <InfinitePersonList
          profileId={profile.id}
          kind={kind}
          initialItems={list.items}
          initialNextCursor={list.nextCursor}
          labels={{
            followsYou: tf("followsYou"),
            menu: tf("personMenuAria", { name: "{name}" }),
            empty: tf(
              kind === "followers" ? "emptyFollowers" : "emptyFollowing",
            ),
            loadFailed: tf("loadMoreFailed"),
            rateLimited: tf("loadMoreRateLimited"),
            retry: tf("retry"),
            follow: followButtonLabels(tf),
            remove: canRemove ? removeFollowerLabels(tf) : null,
          }}
        />
      )}
    </div>
  );
}
