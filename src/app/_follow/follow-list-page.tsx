import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/app/_auth/session";
import { loadProfilePage, profilePath } from "@/app/_profile/queries";
import { BackLink } from "@/components/back-link";
import { EmptyState } from "@/components/empty-state";
import { FollowButton } from "@/components/follow/follow-button";
import { PersonList, PersonRow } from "@/components/follow/person-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { followButtonLabels } from "./labels";
import { loadFollowList, type FollowListKind } from "./queries";

// Páginas /@handle/seguidores e /@handle/seguindo: a lista do vínculo mais
// recente ao mais antigo, 30 por página (`?pagina=N`). Quem não pode ver a
// lista (perfil privado sem solicitação aceita) lê o aviso, não a lista.
export async function FollowListPage({
  kind,
  handle,
  searchParams,
}: {
  kind: FollowListKind;
  handle: string;
  searchParams: Promise<{ pagina?: string | string[] }>;
}) {
  const user = await requireUser(
    `${profilePath(handle)}/${kind === "followers" ? "seguidores" : "seguindo"}`,
  );
  const result = await loadProfilePage(user, handle);
  if (!result.ok) notFound();
  const { profile } = result.value;
  const raw = (await searchParams).pagina;
  const parsed = Number(Array.isArray(raw) ? raw[0] : raw);
  const page = Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
  const tf = await getTranslations("seguidores");
  const name = profile.displayName ?? `@${profile.handle}`;
  const base = `${profilePath(profile.handle)}/${kind === "followers" ? "seguidores" : "seguindo"}`;
  const list = profile.canSeeDetails
    ? await loadFollowList(user, profile.id, kind, page)
    : null;
  const labels = followButtonLabels(tf);

  return (
    <div className="flex max-w-reading flex-col gap-6">
      <BackLink fallbackHref={profilePath(profile.handle)} />
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold break-words">
          {tf(kind === "followers" ? "followersOf" : "followingOf", { name })}
        </h1>
        <Link
          href={profilePath(profile.handle)}
          className="text-muted-foreground hover:underline"
        >
          @{profile.handle}
        </Link>
      </header>
      {list === null ? (
        <p className="text-muted-foreground">{tf("listLocked", { name })}</p>
      ) : list.people.length === 0 ? (
        <EmptyState
          title={tf(kind === "followers" ? "emptyFollowers" : "emptyFollowing")}
        />
      ) : (
        <>
          <PersonList>
            {list.people.map((person) => {
              const personName = person.displayName ?? `@${person.handle}`;
              const followsYou = person.relation?.followsViewer ?? false;
              return (
                <PersonRow
                  key={person.profileId}
                  person={person}
                  badge={
                    followsYou && person.profileId !== user.id ? (
                      <Badge variant="outline">{tf("followsYou")}</Badge>
                    ) : null
                  }
                >
                  {person.profileId === user.id ? null : (
                    <FollowButton
                      profileId={person.profileId}
                      name={personName}
                      status={person.relation?.following ?? null}
                      followsYou={followsYou}
                      labels={labels}
                    />
                  )}
                </PersonRow>
              );
            })}
          </PersonList>
          {page > 1 || list.hasNext ? (
            <nav className="flex justify-between" aria-label="Páginas">
              {page > 1 ? (
                <Button
                  variant="outline"
                  size="sm"
                  render={
                    <Link
                      href={page === 2 ? base : `${base}?pagina=${page - 1}`}
                    />
                  }
                  nativeButton={false}
                >
                  {tf("previousPage")}
                </Button>
              ) : (
                <span />
              )}
              {list.hasNext ? (
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={`${base}?pagina=${page + 1}`} />}
                  nativeButton={false}
                >
                  {tf("nextPage")}
                </Button>
              ) : null}
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
