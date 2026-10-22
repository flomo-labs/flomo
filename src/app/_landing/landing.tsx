import Link from "next/link";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { signInWithGoogle } from "@/app/_auth/actions";
import { listShelfCached } from "@/app/_catalog/cached-shelf";
import { FOLLOWING_PATH } from "@/app/_profile/start-screen-path";
import { LandingMenu } from "@/components/landing/landing-menu";
import { PosterWall } from "@/components/landing/poster-wall";
import { Button } from "@/components/ui/button";

const WALL_SIZE = 25;

// Raiz do site para quem não entrou, em tela cheia (sem o cabeçalho e o rodapé
// do app): os pôsteres mais populares da semana, a chamada, o botão de entrar e
// o menu "···" com os links do rodapé e o aviso do TMDB.
export async function Landing() {
  const t = await getTranslations("Landing");
  return (
    <div
      data-landing
      className="relative isolate flex min-h-dvh flex-col overflow-hidden"
    >
      <header className="relative z-10 flex h-15 items-center justify-between px-5 md:h-18 md:px-12">
        <span className="text-lg font-bold md:text-xl">Flomo</span>
        <div className="flex items-center gap-3 md:gap-5">
          <Button
            variant="outline"
            render={<Link href="/entrar" />}
            nativeButton={false}
            className="h-9 rounded-full px-4"
          >
            {t("enter")}
          </Button>
          <LandingMenu label={t("menu")} tmdbNotice={t("tmdbNotice")} />
        </div>
      </header>
      <Suspense fallback={null}>
        <Wall />
      </Suspense>
      <main className="relative z-10 flex flex-col gap-5 px-5 pt-6 md:flex-1 md:justify-center md:gap-6 md:px-12 md:pt-0">
        <h1 className="text-4xl leading-[1.05] font-extrabold tracking-tight md:max-w-[38rem] md:text-[3.625rem]">
          {t("headline")}
        </h1>
        <p className="max-w-md text-[1.0625rem] leading-relaxed text-muted-foreground md:text-[1.1875rem] md:leading-normal">
          {t("body")}
        </p>
        <div className="mt-1 flex flex-col gap-4 md:mt-3 md:flex-row md:items-center md:gap-6">
          <form action={signInWithGoogle}>
            <input type="hidden" name="next" value={FOLLOWING_PATH} />
            <Button
              type="submit"
              className="h-13 w-full rounded-full px-7 text-base md:w-auto"
            >
              {t("signIn")}
            </Button>
          </form>
          <Link
            href="/descobrir"
            className="text-center text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {t("seeTrending")}
          </Link>
        </div>
      </main>
      {/* Exigido para quem entra direto pela landing (ver /entrar). */}
      <p className="relative z-10 mt-auto px-5 pt-8 pb-6 text-xs text-muted-foreground md:max-w-[45%] md:px-12 md:pt-0 md:pb-8">
        {t.rich("consent", {
          terms: (chunks) => (
            <Link href="/termos" className="underline underline-offset-4">
              {chunks}
            </Link>
          ),
          privacy: (chunks) => (
            <Link href="/privacidade" className="underline underline-offset-4">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}

// Pôsteres das duas listas que o Descobrir já carrega (em alta e nos cinemas),
// alternados e sem repetir. Sem pôsteres suficientes (TMDB fora do ar, por
// exemplo) a chamada fica sem o mosaico.
async function Wall() {
  await connection();
  const shelves = await Promise.allSettled([
    listShelfCached({ kind: "trending" }),
    listShelfCached({ kind: "now_playing" }),
  ]);
  const lists = shelves.map((shelf) => {
    if (shelf.status === "fulfilled") return shelf.value.value;
    console.error("Falha ao carregar os pôsteres da landing:", shelf.reason);
    return [];
  });
  const posters = interleave(lists)
    .map((item) => item.posterPath)
    .filter((path): path is string => path !== null)
    .filter((path, i, all) => all.indexOf(path) === i)
    .slice(0, WALL_SIZE);
  if (posters.length < 8) return null;
  return (
    <PosterWall
      posters={posters}
      className="relative -mt-15 h-[26rem] shrink-0 md:absolute md:mt-0 md:inset-0 md:-z-10 md:h-auto"
    />
  );
}

function interleave<T>(lists: T[][]): T[] {
  const longest = Math.max(0, ...lists.map((list) => list.length));
  return Array.from({ length: longest }, (_, i) =>
    lists.flatMap((list) => (i < list.length ? [list[i]] : [])),
  ).flat();
}
