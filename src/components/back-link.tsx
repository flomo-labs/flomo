"use client";

import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// Volta à tela anterior do histórico. Sem histórico (link aberto direto, aba
// nova), leva ao `fallbackHref`. É um link de verdade: funciona sem
// JavaScript, que só troca o clique por "voltar".
export function BackLink({ fallbackHref = "/" }: { fallbackHref?: string }) {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="self-start"
      render={<Link href={fallbackHref} />}
      nativeButton={false}
      onClick={(event) => {
        if (window.history.length > 1) {
          event.preventDefault();
          router.back();
        }
      }}
    >
      <ArrowLeftIcon data-icon="inline-start" />
      Voltar
    </Button>
  );
}

// Faixa de voltar das páginas públicas: a Home é a raiz e não tem para onde
// voltar.
export function BackBar() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return <BackLink />;
}
