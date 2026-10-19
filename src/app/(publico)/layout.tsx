import { Suspense } from "react";
import { BackBar } from "@/components/back-link";
import { MobileNav, SiteHeader } from "@/components/site-header";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main className="page-container flex flex-col gap-6 py-6 md:py-10">
        <Suspense>
          <BackBar />
        </Suspense>
        {children}
      </main>
      <Suspense>
        <MobileNav />
      </Suspense>
    </>
  );
}
