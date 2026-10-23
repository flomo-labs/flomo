import { EmptyState } from "@/components/empty-state";
import { EmptyTv } from "@/components/illustrations/empty-tv";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { requireUser } from "@/app/_auth/session";
import { HandleReminder } from "@/app/_profile/handle-reminder";
import { followingLabels, loadFollowing } from "@/app/_library/following";
import { FollowingSections } from "@/app/_library/following-sections";
import { FollowingList } from "@/app/_library/following-list";
import { Button } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Following");
  return { title: `${t("title")} · Flomo`, description: t("description") };
}

export default function SeguintesPage() {
  return (
    <>
      <Heading />
      <Suspense>
        <HandleReminder />
      </Suspense>
      <Suspense fallback={<p className="text-muted-foreground">…</p>}>
        <Body />
      </Suspense>
    </>
  );
}

async function Heading() {
  const t = await getTranslations("Following");
  return <h1 className="text-page-title">{t("title")}</h1>;
}

async function Body() {
  const t = await getTranslations("Following");
  await requireUser("/seguintes");
  const rows = await loadFollowing();

  return (
    <>
      <FollowingSections
        labels={{
          sections: t("sections"),
          queue: t("queue"),
          soon: t("soon"),
          soonHint: t("soonHint"),
        }}
      />
      {rows === null ? (
        <p role="alert" className="text-destructive">
          {t("unavailable")}
        </p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<EmptyTv className="size-28" />}
          title={t("emptyTitle")}
          description={t("empty")}
          action={
            <Button render={<Link href="/descobrir" />} nativeButton={false}>
              {t("search")}
            </Button>
          }
        />
      ) : (
        <FollowingList rows={rows} labels={await followingLabels()} />
      )}
    </>
  );
}
