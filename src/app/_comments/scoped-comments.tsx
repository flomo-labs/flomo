import { getTranslations } from "next-intl/server";
import { CommentsDisclosure } from "@/components/comments/comments-disclosure";
import { CommentBlock } from "./comment-block";
import { getCommentLabels } from "./labels";
import { commentsFor, getMyComments } from "./state";

// Comentários de uma temporada ou de um episódio: um botão "Comentários" que
// abre o bloco (o mesmo do título) sob demanda. Visitante não vê o botão (o
// convite para entrar já está na seção do título) e, se os próprios
// comentários não carregarem, também não: o bloco precisa deles.
export async function ScopedComments({
  titleId,
  seasonId,
  episodeId,
  targetName,
}: {
  titleId: string;
  seasonId?: string;
  episodeId?: string;
  // "Temporada 2", "Episódio 3": nome acessível do botão.
  targetName: string;
}) {
  const [t, labels, view] = await Promise.all([
    getTranslations("Comments"),
    getCommentLabels(),
    getMyComments(titleId),
  ]);
  if (view.kind !== "ok") return null;
  const scope = { titleId, seasonId, episodeId };
  return (
    <CommentsDisclosure
      label={t("title")}
      ariaLabel={t("openFor", { target: targetName })}
    >
      <CommentBlock
        scope={scope}
        own={commentsFor(view.comments, { seasonId, episodeId })}
        labels={labels}
      />
    </CommentsDisclosure>
  );
}
