import Link from "next/link";
import { SectionHeader } from "@/components/section-header";
import { COMMENT_PAGE_SIZE } from "@/components/comments/constants";
import { getTranslations } from "next-intl/server";
import { CommentBlock } from "./comment-block";
import { getCommentLabels } from "./labels";
import { commentsFor, getMyComments, getOtherComments } from "./state";

// Seção "Comentários" da página do título: o formulário, os comentários do
// próprio usuário e os de outras pessoas (primeira página lida aqui; as
// seguintes, no navegador). Os de temporada e episódio ficam em cada um deles
// (`ScopedComments`). Visitante só vê o convite para entrar: anônimo não lê.
export async function CommentSection({
  titleId,
  loginHref,
}: {
  titleId: string;
  loginHref: string;
}) {
  const [t, labels, view, others] = await Promise.all([
    getTranslations("Comments"),
    getCommentLabels(),
    getMyComments(titleId),
    getOtherComments(titleId, COMMENT_PAGE_SIZE),
  ]);

  return (
    <section className="flex flex-col gap-4" aria-labelledby="comentarios">
      <SectionHeader id="comentarios" title={t("title")} />
      {view.kind === "anonymous" ? (
        <p>
          <Link href={loginHref} className="underline underline-offset-4">
            {t("login")}
          </Link>
        </p>
      ) : view.kind === "unavailable" ? (
        <p className="text-muted-foreground">{t("unavailable")}</p>
      ) : (
        <CommentBlock
          scope={{ titleId }}
          own={commentsFor(view.comments, {})}
          initial={others.kind === "ok" ? others.page : undefined}
          labels={labels}
        />
      )}
    </section>
  );
}
