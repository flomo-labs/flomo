"use client";

import { type CSSProperties, useSyncExternalStore } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { Icon } from "@/components/icon";

// Avisos rápidos (toast) do Sonner, no visual do app: pílula com texto
// branco, verde (`success`) no sucesso e magenta nos demais. No desktop fica
// no canto inferior direito; no celular, no alto, logo abaixo do cabeçalho
// (h-16), porque embaixo ficaria sobre a barra de navegação. O Sonner anuncia
// o texto ao leitor de tela e respeita `prefers-reduced-motion`. Base do
// shadcn sem `next-themes`: o app tem tema único, escuro.
const BELOW_HEADER = "4.5rem";
// Mesmo corte celular/desktop do app (`md`, 48rem).
const DESKTOP = "(min-width: 48rem)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(DESKTOP);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

// No servidor não há aviso nenhum: começa como celular, e a posição certa
// vale antes do primeiro aviso aparecer.
function useIsDesktop() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP).matches,
    () => false,
  );
}

function Toaster(props: ToasterProps) {
  const desktop = useIsDesktop();
  return (
    <Sonner
      theme="dark"
      // Sem isto o Sonner ignora as cores `--success-*` abaixo.
      richColors
      position={desktop ? "bottom-right" : "top-right"}
      offset={
        desktop
          ? { bottom: "1.5rem", right: "1.5rem" }
          : { top: BELOW_HEADER, right: "1rem" }
      }
      mobileOffset={{ top: BELOW_HEADER, right: "1rem", left: "1rem" }}
      icons={{ success: <Icon name="check" filled className="size-5" /> }}
      style={
        {
          "--normal-bg": "var(--primary)",
          "--normal-text": "var(--primary-foreground)",
          "--normal-border": "transparent",
          "--success-bg": "var(--success)",
          "--success-text": "var(--success-foreground)",
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
