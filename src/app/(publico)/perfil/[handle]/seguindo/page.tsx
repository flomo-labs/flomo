import type { Metadata } from "next";
import { Suspense } from "react";
import { FollowListPage } from "@/app/_follow/follow-list-page";
import { LoadingRegion } from "@/components/loading/loading-region";
import { ProfileSkeleton } from "@/components/loading/profile-skeleton";

// O título não cita o nome: o perfil pode ser privado.
export const metadata: Metadata = {
  title: "Seguindo · Flomo",
  robots: { index: false },
};

export default function Page({
  params,
  searchParams,
}: PageProps<"/perfil/[handle]/seguindo">) {
  return (
    <Suspense
      fallback={
        <LoadingRegion>
          <ProfileSkeleton />
        </LoadingRegion>
      }
    >
      <Content params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({
  params,
  searchParams,
}: Pick<PageProps<"/perfil/[handle]/seguindo">, "params" | "searchParams">) {
  const { handle } = await params;
  return (
    <FollowListPage
      kind="following"
      handle={handle}
      searchParams={searchParams}
    />
  );
}
