import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/app/_auth/session";
import { listFollowing } from "@/domain/library/following";
import type { FollowingItem } from "@/domain/library/ports";
import { withUser } from "@/infra/db/client";
import { createLibraryRepository } from "@/infra/db/library-repository";
import type { FollowingLabels, FollowingRow } from "./following-list";

type Translate = Awaited<ReturnType<typeof getTranslations<"Following">>>;

function toRow(
  item: FollowingItem,
  t: Translate,
  poster: string,
): FollowingRow {
  const base = {
    titleId: item.titleId,
    mediaType: item.mediaType,
    title: item.title,
    posterPath: item.posterPath,
    posterAlt: poster,
  };
  if (item.next) {
    const { episodeId, seasonNumber, episodeNumber, episodeName } = item.next;
    const position = t("position", {
      season: seasonNumber,
      episode: episodeNumber,
    });
    return {
      ...base,
      href: `/titulo/${item.titleId}?temporada=${seasonNumber}`,
      position,
      episodeName: episodeName || null,
      mark: { kind: "episode", episodeId },
      markLabel: t("markEpisode", {
        title: item.title,
        season: seasonNumber,
        episode: episodeNumber,
      }),
    };
  }
  return {
    ...base,
    href: `/titulo/${item.titleId}`,
    position: null,
    episodeName: null,
    mark: { kind: "movie", titleId: item.titleId },
    markLabel: t("markMovie", { title: item.title }),
  };
}

// Fila "Seguintes" do usuário logado, em lista reutilizável. `null` quando
// não há login ou não deu para ler; lista vazia quando não há nada na fila.
export async function loadFollowing(): Promise<FollowingRow[] | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  let items: FollowingItem[];
  try {
    const result = await withUser(user.claims, (tx) =>
      listFollowing(
        { library: createLibraryRepository(tx), now: () => new Date() },
        { id: user.id },
      ),
    );
    if (!result.ok) return null;
    items = result.value;
  } catch (error) {
    console.error("Falha ao ler os Seguintes:", error);
    return null;
  }
  const t = await getTranslations("Following");
  const tt = await getTranslations("Title");
  return items.map((item) =>
    toRow(item, t, tt("poster", { title: item.title })),
  );
}

export async function followingLabels(): Promise<FollowingLabels> {
  const t = await getTranslations("Following");
  return {
    filters: t("filters"),
    kinds: { both: t("kind.both"), tv: t("kind.tv"), movie: t("kind.movie") },
    emptyFilter: t("emptyFilter"),
    markFailed: t("markFailed"),
  };
}
