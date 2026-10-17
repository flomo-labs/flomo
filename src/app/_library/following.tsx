import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/app/_auth/session";
import { listFollowing } from "@/domain/library/following";
import type { FollowingItem } from "@/domain/library/ports";
import { withUser } from "@/infra/db/client";
import { createLibraryRepository } from "@/infra/db/library-repository";
import {
  FollowingList,
  type FollowingLabels,
  type FollowingRow,
} from "./following-list";

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
      detail: episodeName ? `${position} · ${episodeName}` : position,
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
    detail: null,
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

// Atalho da Home: só aparece para quem está logado e tem algo na fila.
export async function FollowingShortcut() {
  const rows = await loadFollowing();
  if (!rows || rows.length === 0) return null;
  const t = await getTranslations("Following");
  return (
    <section className="flex flex-col gap-3" aria-labelledby="seguintes">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="seguintes" className="text-xl font-semibold">
          {t("title")}
        </h2>
        <Link
          href="/seguintes"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {t("seeAll")}
        </Link>
      </div>
      <FollowingList rows={rows} labels={await followingLabels()} max={5} />
    </section>
  );
}
