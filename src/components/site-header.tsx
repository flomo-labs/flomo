import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { isProvisionalHandle } from "@/contracts/profile";
import { signOut } from "@/app/_auth/actions";
import { getCurrentUser } from "@/app/_auth/session";
import { getOwnProfile } from "@/app/_profile/queries";
import { UserMenu } from "./user-menu";

export function SiteHeader() {
  return (
    <header className="border-b border-border py-3">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6">
        <div className="flex items-center gap-5">
          <Link href="/" className="text-lg font-bold">
            Flomo
          </Link>
          <Link href="/buscar" className={NAV_LINK_CLASS}>
            Buscar
          </Link>
          <Suspense>
            <PrivateLinks />
          </Suspense>
        </div>
        <Suspense fallback={<div className="size-8" />}>
          <Account />
        </Suspense>
      </div>
    </header>
  );
}

const NAV_LINK_CLASS =
  "text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline";

// Seguintes e Biblioteca só existem para quem está logado.
async function PrivateLinks() {
  if (!(await getCurrentUser())) return null;
  return (
    <>
      <Link href="/seguintes" className={NAV_LINK_CLASS}>
        Seguintes
      </Link>
      <Link href="/biblioteca" className={NAV_LINK_CLASS}>
        Biblioteca
      </Link>
    </>
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
      signOut={signOut}
    />
  );
}
