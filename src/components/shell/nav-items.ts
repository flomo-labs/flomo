// Dados puros (passam do servidor para os componentes de cliente).
export type NavIcon = "home" | "discover" | "library" | "profile";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  // Telas em que o item aparece como o atual: igual a, ou começando por.
  exact?: string[];
  prefixes?: string[];
  // Rota que redireciona (e grava cookie): navegação completa, sem Link.
  fullNavigation?: boolean;
};

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  return (
    Boolean(item.exact?.includes(pathname)) ||
    Boolean(item.prefixes?.some((prefix) => pathname.startsWith(prefix)))
  );
}

// Início hoje leva à tela escolhida pelo usuário (Home ou Seguintes).
export const HOME_ITEM: NavItem = {
  href: "/inicio",
  label: "Início",
  icon: "home",
  exact: ["/", "/seguintes", "/inicio"],
  fullNavigation: true,
};

// Descobrir é a busca de hoje; ganha recomendações depois.
export const DISCOVER_ITEM: NavItem = {
  href: "/buscar",
  label: "Descobrir",
  icon: "discover",
  prefixes: ["/buscar"],
};

export const LIBRARY_ITEM: NavItem = {
  href: "/biblioteca",
  label: "Biblioteca",
  icon: "library",
  prefixes: ["/biblioteca"],
};

export function profileItem(href: string): NavItem {
  return {
    href,
    label: "Perfil",
    icon: "profile",
    prefixes: ["/perfil/", "/configuracoes"],
  };
}
