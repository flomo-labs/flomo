// Tela inicial de quem está logado.
export const FOLLOWING_PATH = "/seguintes";

type Navigation = {
  method: string;
  pathname: string;
  // Cabeçalhos `Sec-Fetch-*`: só a navegação de verdade (digitar o endereço,
  // abrir um favorito ou link externo) conta; prefetch e RSC não.
  fetchMode: string | null;
  fetchDest: string | null;
  signedIn: boolean;
};

// Quem está logado e abre a raiz vai direto para o Seguintes (redirecionamento
// de verdade, no proxy, antes de a landing começar a ser enviada).
export function shouldRedirectToStart(nav: Navigation): boolean {
  return (
    nav.signedIn &&
    nav.method === "GET" &&
    nav.pathname === "/" &&
    nav.fetchMode === "navigate" &&
    nav.fetchDest === "document"
  );
}
