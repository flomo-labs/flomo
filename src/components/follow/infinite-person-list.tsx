"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { loadMorePeople } from "@/app/_follow/actions";
import { EmptyState } from "@/components/empty-state";
import { PersonActionsMenu } from "@/components/follow/person-actions-menu";
import { PersonList, PersonRow } from "@/components/follow/person-row";
import type { RemoveFollowerLabels } from "@/components/follow/remove-follower-dialog";
import type { FollowToggleLabels } from "@/components/follow/use-follow-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { FollowListCursor, FollowStatus } from "@/contracts/follow";

export type FollowListItem = {
  profileId: string;
  handle: string;
  displayName: string | null;
  // Como o usuário logado se relaciona com a pessoa (`null` = não segue).
  following: FollowStatus | null;
  // A pessoa segue o usuário logado (vínculo aceito).
  followsYou: boolean;
  // A linha é do próprio usuário logado: não tem menu.
  isSelf: boolean;
};

export type InfinitePersonListLabels = {
  followsYou: string;
  // Nome acessível do menu "⋮", com `{name}`.
  menu: string;
  empty: string;
  loadFailed: string;
  retry: string;
  follow: FollowToggleLabels;
  // Só na lista de seguidores do próprio dono.
  remove: RemoveFollowerLabels | null;
};

// Lista de pessoas com rolagem infinita: o primeiro trecho vem do servidor e
// os seguintes são pedidos (`loadMorePeople`) quando o fim da lista chega perto
// da tela. Quem é removido sai da lista na hora. O banco pagina por cursor (o
// último item entregue), então remover, seguir ou deixar de seguir durante a
// rolagem não pula nem repete ninguém.
export function InfinitePersonList({
  profileId,
  kind,
  initialItems,
  initialNextCursor,
  labels,
}: {
  profileId: string;
  kind: "followers" | "following";
  initialItems: FollowListItem[];
  // Cursor do último item do trecho inicial; `null` quando não há mais.
  initialNextCursor: FollowListCursor | null;
  labels: InfinitePersonListLabels;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  // Quantos trechos já foram pedidos: refaz o observador só a cada trecho.
  const [batches, setBatches] = useState(0);
  // Cursor do último item já entregue pelo servidor (mesmo que removido
  // depois); `null` quando a lista acabou.
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const cursor = useRef(initialNextCursor);
  const hasMore = nextCursor !== null;
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    const after = cursor.current;
    if (busy.current || !after) return;
    busy.current = true;
    setLoading(true);
    setFailed(false);
    try {
      const result = await loadMorePeople({
        profileId,
        kind,
        after,
      });
      if (!result.ok) {
        if (result.error.code === "UNAUTHENTICATED") {
          router.push("/entrar");
          return;
        }
        setFailed(true);
        return;
      }
      cursor.current = result.value.nextCursor;
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.profileId));
        return [
          ...prev,
          ...result.value.items.filter((p) => !seen.has(p.profileId)),
        ];
      });
      setNextCursor(result.value.nextCursor);
      setBatches((n) => n + 1);
    } catch {
      setFailed(true);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [profileId, kind, router]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore || failed) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore();
      },
      { rootMargin: "400px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
    // `batches` na lista: depois de cada trecho o observador é recriado e, se o
    // fim ainda estiver perto da tela, já pede o seguinte.
  }, [hasMore, failed, loadMore, batches]);

  function onRemoved(id: string) {
    setItems((prev) => prev.filter((p) => p.profileId !== id));
  }

  if (items.length === 0 && !hasMore) {
    return <EmptyState title={labels.empty} />;
  }

  return (
    <>
      <PersonList>
        {items.map((person) => {
          const name = person.displayName ?? `@${person.handle}`;
          return (
            <PersonRow
              key={person.profileId}
              person={person}
              badge={
                person.followsYou && !person.isSelf ? (
                  <Badge variant="outline">{labels.followsYou}</Badge>
                ) : null
              }
            >
              {person.isSelf ? null : (
                <PersonActionsMenu
                  profileId={person.profileId}
                  name={name}
                  status={person.following}
                  followsYou={person.followsYou}
                  labels={labels.follow}
                  menuLabel={labels.menu}
                  removeLabels={labels.remove}
                  onRemoved={() => onRemoved(person.profileId)}
                />
              )}
            </PersonRow>
          );
        })}
      </PersonList>
      {hasMore ? (
        <div
          ref={sentinel}
          className="flex min-h-10 items-center justify-center"
        >
          {failed ? (
            <div className="flex flex-col items-center gap-2">
              <p role="alert" className="text-sm text-destructive">
                {labels.loadFailed}
              </p>
              <Button variant="outline" size="sm" onClick={() => void loadMore()}>
                {labels.retry}
              </Button>
            </div>
          ) : loading ? (
            <Spinner />
          ) : null}
        </div>
      ) : null}
    </>
  );
}
