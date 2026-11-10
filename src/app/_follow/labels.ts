import type { getTranslations } from "next-intl/server";
import type { FollowButtonLabels } from "@/components/follow/follow-button";

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
  };
}
