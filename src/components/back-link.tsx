"use client";

import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Quantas telas do próprio app há atrás da atual na sessão do navegador. Zera
// a cada carga completa da página: link aberto direto, aba nova ou vindo de
// outro site. Assim "Voltar" só volta entre telas do app, nunca para fora.
let appHistoryDepth = 0;
let tracking = false;

// Sem tela, montado uma vez no layout raiz. Conta as navegações do app
// (`pushState`; `replaceState` não cria entrada) e desconta as voltas.
export function NavigationTracker() {
  useEffect(() => {
    if (tracking) return;
    tracking = true;
    const push = window.history.pushState;
    window.history.pushState = function (...args) {
      appHistoryDepth += 1;
      return push.apply(this, args);
    };
    window.addEventListener("popstate", () => {
      appHistoryDepth = Math.max(0, appHistoryDepth - 1);
    });
  }, []);
  return null;
}

// Volta à tela anterior do app. Sem tela anterior do app (link aberto
// direto, aba nova, vindo de outro site), leva ao `fallbackHref`. É um link de verdade: funciona sem
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
        if (appHistoryDepth > 0) {
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
