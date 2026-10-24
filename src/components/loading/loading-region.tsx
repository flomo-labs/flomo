import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

// Envolve um esqueleto: o leitor de tela ouve "Carregando…" uma vez (o bloco
// vira `role="status"` e é removido quando o conteúdo chega) e os blocos
// decorativos ficam escondidos dele.
export async function LoadingRegion({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const t = await getTranslations("Loading");
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{t("status")}</span>
      <div aria-hidden className="contents">
        {children}
      </div>
    </div>
  );
}
