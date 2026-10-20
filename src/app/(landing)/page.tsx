import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/app/_auth/session";
import { Landing } from "@/app/_landing/landing";
import { FOLLOWING_PATH } from "@/app/_profile/start-screen-path";

// Visitante vê a landing. Quem está logado é levado ao Seguintes pelo proxy;
// a checagem aqui cobre a navegação dentro do app, que não passa por ele como
// documento. A landing fica fora do Suspense para sair já na primeira resposta
// (e esconder o rodapé do app desde o início).
export default function RootPage() {
  return (
    <>
      <Suspense>
        <RedirectSignedIn />
      </Suspense>
      <Landing />
    </>
  );
}

async function RedirectSignedIn() {
  if (await getCurrentUser()) redirect(FOLLOWING_PATH);
  return null;
}
