import { SearchIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { isProvisionalHandle } from "@/contracts/profile";
import { signOut } from "@/app/_auth/actions";
import { getCurrentUser } from "@/app/_auth/session";
import { getOwnProfile, profilePath } from "@/app/_profile/queries";
import { BottomNav } from "./shell/bottom-nav";
import { HeaderSearch } from "./shell/header-search";
import { NavLink } from "./shell/nav-link";
import { navLinkClass } from "./shell/nav-link-style";
import {
  DISCOVER_ITEM,
  HOME_ITEM,
  LIBRARY_ITEM,
  profileItem,
} from "./shell/nav-items";
import { UserMenu } from "./user-menu";

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="page-container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-4 md:gap-6">
          <Link href="/" className="text-lg font-bold">
            Flomo
          </Link>
          <Suspense fallback={<DiscoverLink />}>
            <NavLinks />
          </Suspense>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <HeaderSearch />
          <Link
            href="/buscar"
            aria-label="Buscar"
            className="grid size-11 place-items-center rounded-full text-muted-foreground hover:text-foreground md:hidden"
          >
            <SearchIcon className="size-5" aria-hidden />
          </Link>
          <Suspense fallback={<div className="size-8" />}>
            <Account />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

// Enquanto a sessão não foi lida, só o Descobrir, que todos têm. Sem o hook
// do caminho atual: ele não pode ficar fora de um Suspense.
function DiscoverLink() {
  return (
    <Link
      href={DISCOVER_ITEM.href}
      className={`hidden md:block ${navLinkClass(false)}`}
    >
      {DISCOVER_ITEM.label}
    </Link>
  );
}

// No celular os destinos ficam na barra inferior; aqui só no desktop.
// Início e Biblioteca só existem para quem está logado.
async function NavLinks() {
  const signedIn = Boolean(await getCurrentUser());
  return (
    <nav
      aria-label="Navegação principal"
      className="hidden items-center gap-1 md:flex"
    >
      {signedIn && <NavLink item={HOME_ITEM} />}
      <NavLink item={DISCOVER_ITEM} />
      {signedIn && <NavLink item={LIBRARY_ITEM} />}
    </nav>
  );
}

// Barra inferior do celular, só para quem está logado.
export async function MobileNav() {
  const user = await getCurrentUser();
  if (!user) return null;
  const profile = await getOwnProfile(user).catch(() => null);
  const handle =
    profile && !isProvisionalHandle(profile.handle) ? profile.handle : null;
  return (
    <BottomNav
      items={[
        HOME_ITEM,
        DISCOVER_ITEM,
        profileItem(handle ? profilePath(handle) : "/cadastro"),
      ]}
    />
  );
}

async function Account() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Button size="sm" render={<Link href="/entrar" />} nativeButton={false}>
        Entrar
      </Button>
    );
  }

  const profile = await getOwnProfile(user).catch(() => null);
  const handle =
    profile && !isProvisionalHandle(profile.handle) ? profile.handle : null;
  return (
    <UserMenu
      label={handle ? `@${handle}` : "Minha conta"}
      initials={handle ? handle.slice(0, 2).toUpperCase() : "?"}
      needsHandle={!handle}
      profileHref={handle ? profilePath(handle) : null}
      signOut={signOut}
    />
  );
}
