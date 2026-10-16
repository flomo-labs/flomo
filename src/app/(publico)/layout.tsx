import { Suspense } from "react";
import { BackBar } from "@/components/back-link";
import { SiteHeader } from "@/components/site-header";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
        <Suspense>
          <BackBar />
        </Suspense>
        {children}
      </main>
    </>
  );
}
