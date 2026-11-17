"use client";

import Link from "next/link";
import { useState } from "react";
import { profileInitials } from "@/app/_profile/initials";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type CommentCardLabels = {
  // Nome mostrado quando o perfil do autor não é legível (perfil privado).
  anonymousAuthor: string;
  spoilers: string;
  // Aviso no lugar do texto de um comentário com spoiler.
  spoilerHidden: string;
  showSpoiler: string;
  hideSpoiler: string;
  edited: string;
};

export type CommentCardData = {
  id: string;
  body: string;
  containsSpoilers: boolean;
  edited: boolean;
  // Já formatada (`formatCommentDate`).
  date: string;
  // `null`: perfil privado que o usuário segue; o comentário vem sem autor.
  author: { handle: string; displayName: string | null } | null;
};

// Comentário de outra pessoa: foto, nome, data e texto. Com spoiler, o texto
// fica escondido até a pessoa pedir para ver.
export function CommentCard({
  comment,
  labels,
}: {
  comment: CommentCardData;
  labels: CommentCardLabels;
}) {
  const [revealed, setRevealed] = useState(false);
  const { author } = comment;
  const name = author
    ? (author.displayName ?? `@${author.handle}`)
    : labels.anonymousAuthor;
  const hidden = comment.containsSpoilers && !revealed;
  const identity = (
    <>
      <Avatar>
        <AvatarFallback>
          {author ? profileInitials(author.displayName, author.handle) : "?"}
        </AvatarFallback>
      </Avatar>
      <span className="font-medium break-words">{name}</span>
    </>
  );

  return (
    <article className="flex flex-col gap-3 rounded-card border border-border p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {author ? (
          <Link
            href={`/@${author.handle}`}
            className="flex min-w-0 items-center gap-3"
          >
            {identity}
          </Link>
        ) : (
          <span className="flex min-w-0 items-center gap-3">{identity}</span>
        )}
        <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{comment.date}</span>
          {comment.edited ? <span>{labels.edited}</span> : null}
          {comment.containsSpoilers ? (
            <Badge variant="secondary">{labels.spoilers}</Badge>
          ) : null}
        </span>
      </div>
      {hidden ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">{labels.spoilerHidden}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRevealed(true)}
          >
            {labels.showSpoiler}
          </Button>
        </div>
      ) : (
        <>
          <p className="whitespace-pre-wrap break-words">{comment.body}</p>
          {comment.containsSpoilers ? (
            <div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setRevealed(false)}
              >
                {labels.hideSpoiler}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </article>
  );
}
