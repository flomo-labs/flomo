import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { isProvisionalHandle } from "@/contracts/profile";
import { signInWithGoogle, signOut } from "@/app/_auth/actions";
import { getCurrentUser } from "@/app/_auth/session";
import { getOwnProfile } from "@/app/_profile/queries";
import { UserMenu } from "./user-menu";

export function SiteHeader() {
  return (
    <header className="border-b border-border py-3">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6">
        <Link href="/" className="text-lg font-bold">
          Flomo
        </Link>
        <Suspense fallback={<div className="size-8" />}>
          <Account />
        </Suspense>
      </div>
    </header>
  );
}

async function Account() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value="/" />
        <Button type="submit" size="sm">
          Entrar com Google
        </Button>
      </form>
    );
  }

  const profile = await getOwnProfile(user).catch(() => null);
  const handle =
    profile && !isProvisionalHandle(profile.handle) ? profile.handle : null;
  return (
    <UserMenu
      label={handle ? `@${handle}` : "Minha conta"}
      initials={handle ? handle.slice(0, 2).toUpperCase() : "?"}
      signOut={signOut}
    />
  );
}
