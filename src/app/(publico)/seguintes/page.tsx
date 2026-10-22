import { EmptyState } from "@/components/empty-state";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { requireUser } from "@/app/_auth/session";
import { HandleReminder } from "@/app/_profile/handle-reminder";
import { followingLabels, loadFollowing } from "@/app/_library/following";
import { FollowingList } from "@/app/_library/following-list";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
      <Tabs value="queue">
        <TabsList aria-label={t("sections")}>
          <TabsTrigger value="queue">{t("queue")}</TabsTrigger>
          {/* Um elemento desabilitado não recebe o mouse: o tooltip fica no
              invólucro. Sem atraso, para a dica não passar despercebida.
              Calendário de lançamentos: Fase 2.3. */}
          <Tooltip>
            <TooltipTrigger delay={0} render={<span tabIndex={0} />}>
              <TabsTrigger value="soon" disabled>
                {t("soon")}
              </TabsTrigger>
            </TooltipTrigger>
            <TooltipContent>{t("soonHint")}</TooltipContent>
          </Tooltip>
        </TabsList>
      </Tabs>
      {rows === null ? (
        <p role="alert" className="text-destructive">
          {t("unavailable")}
        </p>
      ) : rows.length === 0 ? (
        <EmptyState
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
