import type { StartScreen } from "@/contracts/profile";

// Caminho de cada tela inicial.
export const START_SCREEN_PATH: Record<StartScreen, string> = {
  home: "/",
  following: "/seguintes",
};

// Rota que manda o usuário para a tela dele (menu "Início" e primeira
// entrada da sessão) e grava o cookie de sessão abaixo.
export const START_ROUTE = "/inicio";

// Cookie de sessão (some ao fechar o navegador): marca que o redirecionamento
// da primeira entrada já aconteceu.
export const START_COOKIE = "flomo_inicio";
export const START_COOKIE_OPTIONS = {
  path: "/",
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
} as const;

type Navigation = {
  method: string;
  pathname: string;
  // Cabeçalhos `Sec-Fetch-*`: só a navegação de verdade (digitar o endereço,
  // abrir um favorito ou link externo) conta; prefetch e RSC não.
  fetchMode: string | null;
  fetchDest: string | null;
  hasCookie: boolean;
  signedIn: boolean;
};

// Primeira entrada da sessão: quem está logado e abre a Home sem o cookie vai
// para /inicio, que decide pela preferência. Depois disso a Home é a Home, e
// o logo do site sempre a alcança.
export function shouldRedirectToStart(nav: Navigation): boolean {
  return (
    nav.signedIn &&
    !nav.hasCookie &&
    nav.method === "GET" &&
    nav.pathname === "/" &&
    nav.fetchMode === "navigate" &&
    nav.fetchDest === "document"
  );
}
