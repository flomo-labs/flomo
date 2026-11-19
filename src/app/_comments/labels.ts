import { getTranslations } from "next-intl/server";
import type { CommentListLabels } from "@/components/comments/comment-list";
import type { CommentFormLabels } from "./comment-form";
import type { CommentItemLabels } from "./comment-item";

export type CommentLabels = {
  form: CommentFormLabels;
  item: CommentItemLabels;
  list: CommentListLabels;
};

// Textos do namespace `Comments`, montados uma vez para o título, as
// temporadas e os episódios (os componentes de cliente recebem tudo pronto).
export async function getCommentLabels(): Promise<CommentLabels> {
  const t = await getTranslations("Comments");
  const likes = {
    like: t("like"),
    unlike: t("unlike"),
    failed: t("likeFailed"),
  };
  const form: CommentFormLabels = {
    body: t("body"),
    placeholder: t("placeholder"),
    spoilers: t("spoilersOption"),
    counter: t.raw("counter") as string,
    submit: t("submit"),
    cancel: t("cancel"),
    failed: t("failed"),
  };
  return {
    form,
    item: {
      form: { ...form, submit: t("save") },
      spoilers: t("spoilersBadge"),
      moderated: t("moderated"),
      edited: t("edited"),
      edit: t("edit"),
      remove: t("remove"),
      confirmRemove: t("confirmRemove"),
      failed: t("failed"),
      likes,
    },
    list: {
      card: {
        anonymousAuthor: t("anonymousAuthor"),
        spoilers: t("spoilersBadge"),
        spoilerHidden: t("spoilerHidden"),
        showSpoiler: t("showSpoiler"),
        hideSpoiler: t("hideSpoiler"),
        edited: t("edited"),
        likes,
      },
      empty: t("othersEmpty"),
      loadMore: t("loadMore"),
      loadFailed: t("loadFailed"),
      retry: t("retry"),
    },
  };
}
