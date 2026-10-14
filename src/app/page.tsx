import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { isProvisionalHandle } from "@/contracts/profile";
import { signOut } from "./_auth/actions";
import { getCurrentUser } from "./_auth/session";
import { getOwnProfile } from "./_profile/queries";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">Flomo</h1>
      <Suspense>
        <Session />
      </Suspense>
    </main>
  );
}

async function Session() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Button render={<Link href="/entrar" />} nativeButton={false}>
        Entrar
      </Button>
    );
  }

  const profile = await getOwnProfile(user);
  const provisional = !profile || isProvisionalHandle(profile.handle);
  return (
    <div className="flex flex-col items-center gap-3">
      {provisional ? (
        <Link href="/cadastro" className="underline underline-offset-4">
          Escolha seu nome de usuário
        </Link>
      ) : (
        <p>
          Olá, <strong>@{profile.handle}</strong>
        </p>
      )}
      <div className="flex gap-2">
        <Button
          variant="outline"
          render={<Link href="/configuracoes" />}
          nativeButton={false}
        >
          Configurações
        </Button>
        <form action={signOut}>
          <Button type="submit" variant="ghost">
            Sair
          </Button>
        </form>
      </div>
    </div>
  );
}
