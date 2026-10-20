// Dados puros (passam do servidor para os componentes de cliente).
export type NavIcon = "following" | "discover" | "library" | "profile";

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

// O Next entrega "/@renato" como "/%40renato"; compara sempre decodificado.
function decodePathname(pathname: string): string {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

export function isNavItemActive(item: NavItem, rawPathname: string): boolean {
  const pathname = decodePathname(rawPathname);
  return (
    Boolean(item.exact?.includes(pathname)) ||
    Boolean(item.prefixes?.some((prefix) => pathname.startsWith(prefix)))
  );
}

// Seguintes hoje leva à tela escolhida pelo usuário (Home ou Seguintes).
export const HOME_ITEM: NavItem = {
  href: "/inicio",
  label: "Seguintes",
  icon: "following",
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
    // /@handle é reescrito para /perfil/handle; conforme a navegação, o
    // pathname chega de um jeito ou de outro.
    exact: [href, href.replace(/^\/@/, "/perfil/")],
    prefixes: ["/configuracoes"],
  };
}
