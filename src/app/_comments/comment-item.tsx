"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CommentLikeButton,
  type CommentLikeLabels,
} from "@/components/comments/comment-like-button";
import { removeComment } from "./actions";
import { CommentForm, type CommentFormLabels } from "./comment-form";

export type CommentItemLabels = {
  form: CommentFormLabels;
  spoilers: string;
  moderated: string;
  edited: string;
  edit: string;
  remove: string;
  confirmRemove: string;
  failed: string;
  likes: CommentLikeLabels;
};

// Um comentário do próprio usuário: texto, edição no lugar e exclusão com
// confirmação, e as curtidas (só publicado: oculto não recebe). `moderated` aparece só quando o comentário não está publicado.
export function CommentItem({
  comment,
  date,
  moderated,
  labels,
}: {
  comment: {
    id: string;
    body: string;
    containsSpoilers: boolean;
    edited: boolean;
    likeCount: number;
    likedByMe: boolean;
  };
  date: string;
  moderated: boolean;
  labels: CommentItemLabels;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function remove() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await removeComment({ commentId: comment.id });
        if (!result.ok) setError(result.error.message || labels.failed);
      } catch {
        setError(labels.failed);
      }
    });
  }

  if (editing) {
    return (
      <CommentForm
        target={{ commentId: comment.id }}
        initial={{
          body: comment.body,
          containsSpoilers: comment.containsSpoilers,
        }}
        onDone={() => setEditing(false)}
        onCancel={() => setEditing(false)}
        labels={labels.form}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>{date}</span>
        {comment.edited ? <span>{labels.edited}</span> : null}
        {comment.containsSpoilers ? (
          <Badge variant="secondary">{labels.spoilers}</Badge>
        ) : null}
        {moderated ? (
          <Badge variant="destructive">{labels.moderated}</Badge>
        ) : null}
      </div>
      <p className="whitespace-pre-wrap break-words">{comment.body}</p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {moderated ? null : (
        <CommentLikeButton
          commentId={comment.id}
          initial={{
            likeCount: comment.likeCount,
            likedByMe: comment.likedByMe,
          }}
          labels={labels.likes}
        />
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => setEditing(true)}
        >
          {labels.edit}
        </Button>
        {confirming ? (
          <>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={pending}
              onClick={remove}
            >
              {labels.confirmRemove}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => setConfirming(false)}
            >
              {labels.form.cancel}
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => setConfirming(true)}
          >
            {labels.remove}
          </Button>
        )}
      </div>
    </div>
  );
}
