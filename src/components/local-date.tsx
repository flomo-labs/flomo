"use client";

import { useSyncExternalStore } from "react";
import { formatCalendarDay } from "@/lib/format-calendar-day";

const DEFAULT_LOCALE = "pt-BR";

const subscribe = () => () => {};
const getLocale = () => navigator.language || DEFAULT_LOCALE;
const getServerLocale = () => DEFAULT_LOCALE;

// Data de calendário (AAAA-MM-DD) no formato do idioma do navegador. A página
// é cacheada no servidor, então o HTML sai em pt-BR e o navegador troca para a
// própria locale depois de hidratar, sem erro de hidratação.
export function LocalDate({ value }: { value: string }) {
  const locale = useSyncExternalStore(subscribe, getLocale, getServerLocale);
  return <time dateTime={value}>{formatCalendarDay(value, locale)}</time>;
}
