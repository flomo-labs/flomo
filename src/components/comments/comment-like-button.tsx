"use client";

import { useRef, useState } from "react";
import { addCommentLike, removeCommentLike } from "@/app/_comments/actions";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";

export type CommentLikeLabels = {
  like: string;
  unlike: string;
  // Aviso quando a curtida não pôde ser feita (ou desfeita).
  failed: string;
};

export type CommentLikeState = { likeCount: number; likedByMe: boolean };

// Coração com a contagem de curtidas de um comentário (#397): igual nos
// comentários de outras pessoas e nos próprios. Otimista: muda na hora e
// volta ao estado anterior se o servidor recusar (ex.: autor bloqueado por
// quem curte, que recebe "comentário não encontrado"). Só um pedido por vez.
export function CommentLikeButton({
  commentId,
  initial,
  labels,
}: {
  commentId: string;
  initial: CommentLikeState;
  labels: CommentLikeLabels;
}) {
  const [state, setState] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  async function toggle() {
    if (busy.current) return;
    busy.current = true;
    const previous = state;
    const liking = !previous.likedByMe;
    setError(null);
    setState({
      likedByMe: liking,
      likeCount: Math.max(0, previous.likeCount + (liking ? 1 : -1)),
    });
    try {
      const result = await (liking ? addCommentLike : removeCommentLike)({
        commentId,
      });
      if (result.ok) {
        setState(result.value);
      } else {
        setState(previous);
        // Limite de pedidos: a mensagem do servidor diz para esperar um instante.
        setError(
          result.error.code === "RATE_LIMITED"
            ? result.error.message
            : labels.failed,
        );
      }
    } catch {
      setState(previous);
      setError(labels.failed);
    } finally {
      busy.current = false;
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-pressed={state.likedByMe}
        aria-label={state.likedByMe ? labels.unlike : labels.like}
        onClick={() => void toggle()}
        className={state.likedByMe ? "text-primary" : "text-muted-foreground"}
      >
        <Icon name="heart" filled={state.likedByMe} />
        {state.likeCount > 0 ? <span>{state.likeCount}</span> : null}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
