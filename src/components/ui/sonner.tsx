"use client";

import type { CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { Icon } from "@/components/icon";

// Avisos rápidos (toast) do Sonner, no visual do app: pílula magenta com
// texto branco, no canto superior direito, logo abaixo do cabeçalho (h-16)
// para não cobrir a busca nem o menu. O Sonner anuncia o texto ao leitor de
// tela e respeita `prefers-reduced-motion`. Base do shadcn sem `next-themes`:
// o app tem tema único, escuro.
const BELOW_HEADER = "4.5rem";

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      position="top-right"
      offset={{ top: BELOW_HEADER, right: "1rem" }}
      mobileOffset={{ top: BELOW_HEADER, right: "1rem", left: "1rem" }}
      icons={{ success: <Icon name="check" filled className="size-5" /> }}
      style={
        {
          "--normal-bg": "var(--primary)",
          "--normal-text": "var(--primary-foreground)",
          "--normal-border": "transparent",
          "--success-bg": "var(--primary)",
          "--success-text": "var(--primary-foreground)",
          "--success-border": "transparent",
          "--border-radius": "var(--radius-card)",
        } as CSSProperties
      }
      toastOptions={{ classNames: { toast: "font-sans text-sm shadow-lg" } }}
      {...props}
    />
  );
}

export { Toaster };
