import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/app/_auth/session";
import { Landing } from "@/app/_landing/landing";

export default function RootPage() {
  return (
    <Suspense>
      <RootBody />
    </Suspense>
  );
}

// Visitante vê a landing; quem entrou vai para o Seguintes.
async function RootBody() {
  const user = await getCurrentUser();
  if (user) redirect("/seguintes");
  return <Landing />;
}
