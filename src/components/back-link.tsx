"use client";

import { Icon } from "@/components/icon";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// Navigation API (`window.navigation`), ainda fora dos tipos do TypeScript.
// `canGoBack` só considera as entradas do próprio site na aba: chegando de
// outro site ou por link direto, é falso.
type NavigationLike = { canGoBack?: boolean };

function canGoBackInApp(): boolean {
  const navigation = (window as Window & { navigation?: NavigationLike })
    .navigation;
  return navigation?.canGoBack === true;
}

// Voltar das telas de detalhe e de texto (#150); as telas raiz da navegação
// (Seguintes, Descobrir, Biblioteca, Perfil) não têm. Volta à tela anterior
// do app; sem tela anterior do app (link aberto direto, aba nova, vindo de
// outro site, ou navegador sem a Navigation API), leva ao `fallbackHref`,
// a tela-pai de quem usa. É um link de verdade: funciona sem JavaScript, que
// só troca o clique por "voltar".
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
        if (canGoBackInApp()) {
          event.preventDefault();
          router.back();
        }
      }}
    >
      <Icon name="arrowBack" data-icon="inline-start" />
      Voltar
    </Button>
  );
}
