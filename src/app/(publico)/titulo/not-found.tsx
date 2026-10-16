import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export default async function TitleNotFound() {
  const t = await getTranslations("Title");
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-2xl font-bold">{t("notFound")}</h1>
      <p className="text-muted-foreground">{t("notFoundHint")}</p>
      <Button render={<Link href="/buscar" />} nativeButton={false}>
        {t("backToSearch")}
      </Button>
    </div>
  );
}
