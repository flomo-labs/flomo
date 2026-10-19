import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { CommentForm } from "./comment-form";
import { CommentItem, type CommentItemLabels } from "./comment-item";
import { getMyComments } from "./state";

// Seção "Comentários" da página do título: o formulário e os comentários do
// próprio usuário. Ler os de outras pessoas é da Fase 2.1.
export async function CommentSection({
  titleId,
  loginHref,
}: {
  titleId: string;
  loginHref: string;
}) {
  const [t, format, view] = await Promise.all([
    getTranslations("Comments"),
    getFormatter(),
    getMyComments(titleId),
  ]);

  const form = {
    body: t("body"),
    placeholder: t("placeholder"),
    spoilers: t("spoilersOption"),
    counter: t.raw("counter") as string,
    submit: t("submit"),
    cancel: t("cancel"),
    failed: t("failed"),
  };
  const item: CommentItemLabels = {
    form: { ...form, submit: t("save") },
    spoilers: t("spoilersBadge"),
    moderated: t("moderated"),
    edited: t("edited"),
    edit: t("edit"),
    remove: t("remove"),
    confirmRemove: t("confirmRemove"),
    failed: t("failed"),
  };

  return (
    <section className="flex flex-col gap-4" aria-labelledby="comentarios">
      <h2 id="comentarios" className="text-section-title">
        {t("title")}
      </h2>
      {view.kind === "anonymous" ? (
        <p>
          <Link href={loginHref} className="underline underline-offset-4">
            {t("login")}
          </Link>
        </p>
      ) : view.kind === "unavailable" ? (
        <p className="text-muted-foreground">{t("unavailable")}</p>
      ) : (
        <>
          <CommentForm target={{ titleId }} labels={form} />
          {view.comments.length === 0 ? (
            <p className="text-muted-foreground">{t("empty")}</p>
          ) : (
            <ul className="flex flex-col gap-6">
              {view.comments.map((comment) => (
                <li key={comment.id}>
                  <CommentItem
                    comment={{
                      id: comment.id,
                      body: comment.body,
                      containsSpoilers: comment.containsSpoilers,
                      edited: comment.updatedAt > comment.createdAt,
                    }}
                    date={format.dateTime(comment.createdAt, {
                      dateStyle: "medium",
                    })}
                    moderated={comment.moderationStatus !== "published"}
                    labels={item}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
