import type { CommentPage } from "@/domain/comment/comments";
import type { CommentRecord } from "@/domain/comment/ports";
import {
  CommentList,
  type CommentListScope,
} from "@/components/comments/comment-list";
import { formatCommentDate } from "@/lib/format-comment-date";
import { CommentForm } from "./comment-form";
import { CommentItem } from "./comment-item";
import type { CommentLabels } from "./labels";

// Bloco de comentários de um alvo (título, temporada ou episódio): o
// formulário, os comentários do próprio usuário e, abaixo, os de outras
// pessoas. É o mesmo nos três alvos; só muda o `scope`. `initial` traz a
// primeira página já lida (título); sem ela, a lista a pede ao montar.
export function CommentBlock({
  scope,
  own,
  initial,
  labels,
}: {
  scope: CommentListScope;
  own: CommentRecord[];
  initial?: CommentPage;
  labels: CommentLabels;
}) {
  return (
    <div className="flex flex-col gap-6">
      <CommentForm target={scope} labels={labels.form} />
      {own.length > 0 ? (
        <ul className="flex flex-col gap-6">
          {own.map((comment) => (
            <li key={comment.id}>
              <CommentItem
                comment={{
                  id: comment.id,
                  body: comment.body,
                  containsSpoilers: comment.containsSpoilers,
                  edited: comment.updatedAt > comment.createdAt,
                }}
                date={formatCommentDate(comment.createdAt)}
                moderated={comment.moderationStatus !== "published"}
                labels={labels.item}
              />
            </li>
          ))}
        </ul>
      ) : null}
      <CommentList scope={scope} initial={initial} labels={labels.list} />
    </div>
  );
}
