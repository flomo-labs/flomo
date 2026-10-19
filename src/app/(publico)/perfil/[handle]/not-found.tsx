import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export default async function ProfileNotFound() {
  const t = await getTranslations("Profile");
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-2xl font-bold">{t("notFoundTitle")}</h1>
      <p className="text-muted-foreground">{t("notFound")}</p>
      <Button render={<Link href="/" />} nativeButton={false}>
        Flomo
      </Button>
    </div>
  );
}
