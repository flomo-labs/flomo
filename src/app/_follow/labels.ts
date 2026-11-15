import type { getTranslations } from "next-intl/server";
import type { FollowButtonLabels } from "@/components/follow/follow-button";
import type { RemoveFollowerButtonLabels } from "@/components/follow/remove-follower-button";

type FollowTranslator = Awaited<
  ReturnType<typeof getTranslations<"seguidores">>
>;

// Textos do `FollowButton` (perfil e listas); `{name}` é preenchido no cliente.
export function followButtonLabels(tf: FollowTranslator): FollowButtonLabels {
  return {
    follow: tf("follow"),
    followBack: tf("followBack"),
    following: tf("following"),
    requested: tf("requested"),
    followAria: tf("followAria", { name: "{name}" }),
    followBackAria: tf("followBackAria", { name: "{name}" }),
    unfollowAria: tf("unfollowAria", { name: "{name}" }),
    cancelAria: tf("cancelAria", { name: "{name}" }),
    nowFollowing: tf("nowFollowing", { name: "{name}" }),
    nowRequested: tf("nowRequested", { name: "{name}" }),
    unfollowed: tf("unfollowed", { name: "{name}" }),
    cancelled: tf("cancelled", { name: "{name}" }),
    failed: tf("failed"),
    rateLimited: tf("rateLimited"),
  };
}

// Textos do `RemoveFollowerButton` (lista de seguidores do dono); `{name}` é preenchido no cliente.
export function removeFollowerLabels(
  tf: FollowTranslator,
): RemoveFollowerButtonLabels {
  return {
    remove: tf("removeFollower"),
    confirmTitle: tf("removeFollowerTitle", { name: "{name}" }),
    confirmDescription: tf("removeFollowerDescription", { name: "{name}" }),
    confirm: tf("removeFollowerConfirm"),
    cancel: tf("removeFollowerCancel"),
    removeAria: tf("removeFollowerAria", { name: "{name}" }),
    removed: tf("followerRemoved", { name: "{name}" }),
    failed: tf("failed"),
  };
}
