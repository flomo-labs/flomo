"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadTitleComments } from "@/app/_comments/actions";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { CommentListCursor } from "@/contracts/comment";
import type { CommentPage } from "@/domain/comment/comments";
import { formatCommentDate } from "@/lib/format-comment-date";
import { CommentCard, type CommentCardLabels } from "./comment-card";
import { COMMENT_PAGE_SIZE } from "./constants";

export type CommentListLabels = {
  card: CommentCardLabels;
  empty: string;
  loadMore: string;
  loadFailed: string;
  retry: string;
};

// Alvo da lista: o título, uma temporada ou um episódio.
export type CommentListScope = {
  titleId: string;
  seasonId?: string;
  episodeId?: string;
};

// Comentários de outras pessoas, em páginas. Com `initial` (título, lido no
// servidor) a primeira página já vem pronta; sem ele (temporada e episódio) a
// lista pede a primeira ao abrir. "Carregar mais" acrescenta a página seguinte
// pelo cursor, então comentário novo ou apagado no meio não repete nem pula
// ninguém.
export function CommentList({
  scope,
  initial,
  labels,
}: {
  scope: CommentListScope;
  initial?: CommentPage;
  labels: CommentListLabels;
}) {
  const [items, setItems] = useState(initial?.items ?? []);
  const [next, setNext] = useState<CommentListCursor | null>(
    initial?.next ?? null,
  );
  // `false` até a primeira página chegar (só quando não veio do servidor).
  const [ready, setReady] = useState(Boolean(initial));
  // Sem página inicial, a primeira já está sendo pedida desde a montagem.
  const [loading, setLoading] = useState(!initial);
  const [failed, setFailed] = useState(false);
  const busy = useRef(!initial);
  const started = useRef(false);
  const scopeKey = JSON.stringify(scope);

  const fetchPage = useCallback(
    async (after: CommentListCursor | null) => {
      try {
        const result = await loadTitleComments({
          ...(JSON.parse(scopeKey) as CommentListScope),
          limit: COMMENT_PAGE_SIZE,
          after,
        });
        if (!result.ok) {
          setFailed(true);
          return;
        }
        setItems((prev) => {
          const seen = new Set(prev.map((c) => c.id));
          return [...prev, ...result.value.items.filter((c) => !seen.has(c.id))];
        });
        setNext(result.value.next);
        setReady(true);
      } catch {
        setFailed(true);
      } finally {
        busy.current = false;
        setLoading(false);
      }
    },
    [scopeKey],
  );

  function load(after: CommentListCursor | null) {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setFailed(false);
    void fetchPage(after);
  }

  useEffect(() => {
    if (initial || started.current) return;
    started.current = true;
    void fetchPage(null);
  }, [initial, fetchPage]);

  if (!ready && !failed) {
    return (
      <div className="flex min-h-10 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && !failed ? (
        <EmptyState title={labels.empty} />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((comment) => (
            <li key={comment.id}>
              <CommentCard
                comment={{
                  id: comment.id,
                  body: comment.body,
                  containsSpoilers: comment.containsSpoilers,
                  edited: comment.updatedAt > comment.createdAt,
                  date: formatCommentDate(comment.createdAt),
                  author: comment.author,
                }}
                labels={labels.card}
              />
            </li>
          ))}
        </ul>
      )}
      {failed ? (
        <div className="flex flex-col items-center gap-2">
          <p role="alert" className="text-sm text-destructive">
            {labels.loadFailed}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => load(ready ? next : null)}
          >
            {labels.retry}
          </Button>
        </div>
      ) : loading ? (
        <div className="flex min-h-10 items-center justify-center">
          <Spinner />
        </div>
      ) : next ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => load(next)}
          >
            {labels.loadMore}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
