import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/app/_auth/session";
import { getOwnProfile } from "@/app/_profile/queries";
import { isProvisionalHandle } from "@/contracts/profile";

// Quem entrou mas ainda não escolheu o nome de usuário vê o convite no Seguintes.
export async function HandleReminder() {
  const user = await getCurrentUser();
  if (!user) return null;
  // Se o perfil não puder ser lido, melhor não mostrar o convite do que
  // mostrá-lo a quem já escolheu o nome.
  let profile;
  try {
    profile = await getOwnProfile(user);
  } catch (error) {
    console.error("Falha ao ler o perfil no convite do handle:", error);
    return null;
  }
  if (profile && !isProvisionalHandle(profile.handle)) return null;
  const t = await getTranslations("Following");
  return (
    <Link
      href="/cadastro"
      className="rounded-lg border border-border p-3 text-sm underline-offset-4 hover:underline"
    >
      {t("chooseHandle")}
    </Link>
  );
}
