import { Suspense } from "react";
import { MobileNav, SiteHeader } from "@/components/site-header";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      {/* O Voltar fica em cada tela de detalhe ou de texto (BackLink). */}
      <main className="page-container flex flex-col gap-6 py-6 md:py-10">
        {children}
      </main>
      <Suspense>
        <MobileNav />
      </Suspense>
    </>
  );
}
