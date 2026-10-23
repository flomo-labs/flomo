import "server-only";
import { getTranslations } from "next-intl/server";
import { HANDLE_MAX_LENGTH, HANDLE_MIN_LENGTH } from "@/contracts/profile";

// Textos dos formulários do perfil (namespace ProfileEdit), montados no
// servidor e passados aos formulários, que são de cliente. Os com valor da
// hora (`{handle}`, `{count}`) vão crus e o formulário troca o valor.

export type HandleFormLabels = {
  label: string;
  hint: string;
  submit: string;
  saving: string;
  saved: string;
};

export async function handleFormLabels(
  submit: "save" | "continue",
): Promise<HandleFormLabels> {
  const t = await getTranslations("ProfileEdit");
  return {
    label: t("handle"),
    hint: t("handleHint", { min: HANDLE_MIN_LENGTH, max: HANDLE_MAX_LENGTH }),
    submit: t(submit),
    saving: t("saving"),
    saved: t.raw("handleSaved") as string,
  };
}

export type ProfileFormLabels = {
  displayName: string;
  bio: string;
  bioCounter: string;
  private: string;
  privateHint: string;
  submit: string;
  saving: string;
  saved: string;
};

export async function profileFormLabels(): Promise<ProfileFormLabels> {
  const t = await getTranslations("ProfileEdit");
  return {
    displayName: t("displayName"),
    bio: t("bio"),
    bioCounter: t.raw("bioCounter") as string,
    private: t("private"),
    privateHint: t("privateHint"),
    submit: t("saveProfile"),
    saving: t("saving"),
    saved: t("saved"),
  };
}
