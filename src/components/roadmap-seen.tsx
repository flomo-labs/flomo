"use client";

import { useEffect, useSyncExternalStore } from "react";
import { ROADMAP_REVISION } from "@/content/roadmap-link";

// "Já viu a novidade?" guardado só no navegador (localStorage), sem conta e sem
// back (#250). O armazenamento pode falhar (aba anônima, dados bloqueados): nesse
// caso o selo simplesmente não aparece, que é o lado seguro.
const KEY = "flomo:roadmap-visto";
const EVENT = "flomo:roadmap-visto";

function read(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return ROADMAP_REVISION;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// No servidor e na hidratação devolve "visto": o selo entra depois, sem
// diferença entre o HTML do servidor e o do cliente.
export function useRoadmapHasNews(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => read() !== ROADMAP_REVISION,
    () => false,
  );
}

// Colocado na página do roadmap: abrir a página apaga o selo.
export function MarkRoadmapSeen() {
  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, ROADMAP_REVISION);
      window.dispatchEvent(new Event(EVENT));
    } catch {
      // Sem armazenamento, o selo não aparece de qualquer jeito.
    }
  }, []);
  return null;
}
