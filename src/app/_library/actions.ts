"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import {
  deleteWatchRecord,
  markEpisodeWatched,
  markMovieWatched,
  markSeasonWatched,
  type MarkSeasonResult,
  rewatchEpisode,
  rewatchMovie,
  setWatchDate,
  unmarkEpisodesWatched,
  unmarkEpisodeWatched,
  unmarkMovieWatched,
  type MarkWatchedErrorCode,
} from "@/domain/library/mark-watched";
import {
  addTitleToLibraryByRef,
  type AddByRefErrorCode,
  type AddByRefResult,
} from "@/domain/library/add-title-by-ref";
import {
  removeTitleFromLibrary,
  setTitleHidden,
  setTitleStatus,
  type SetStatusErrorCode,
} from "@/domain/library/set-status";
import { fail, type Result } from "@/domain/result";
import { allowProviderFetch, createCatalogDeps } from "@/infra/catalog";
import { withUser } from "@/infra/db/client";
import { createLibraryRepository } from "@/infra/db/library-repository";
import { getCurrentUser } from "../_auth/session";

// Camada fina (ADR-004): resolve o usuário, chama o caso de uso dentro do
// `withUser` (RLS) e atualiza as páginas de título. A regra fica em
// domain/library/mark-watched.ts. Cada ação confere o login por conta
// própria: Server Actions aceitam POST direto, não só os botões da tela.

export type LibraryActionResult = Result<
  Record<string, never>,
  MarkWatchedErrorCode | SetStatusErrorCode | "UNAUTHENTICATED"
>;

type UseCase = (
  deps: {
    library: ReturnType<typeof createLibraryRepository>;
    now: () => Date;
  },
  user: { id: string },
  input: unknown,
) => Promise<Result<unknown, MarkWatchedErrorCode | SetStatusErrorCode>>;

async function runWithValue<T>(
  useCase: (
    ...args: Parameters<UseCase>
  ) => Promise<Result<T, MarkWatchedErrorCode | SetStatusErrorCode>>,
  input: unknown,
): Promise<
  Result<T, MarkWatchedErrorCode | SetStatusErrorCode | "UNAUTHENTICATED">
> {
  const user = await getCurrentUser();
  if (!user) {
    return fail("UNAUTHENTICATED", "Sua sessão expirou. Entre de novo.");
  }
  const result = await withUser(user.claims, (tx) =>
    useCase(
      { library: createLibraryRepository(tx), now: () => new Date() },
      { id: user.id },
      input,
    ),
  );
  if (!result.ok) return result;
  // O estado do usuário é lido na requisição; isto só refaz as páginas de
  // título para quem estiver com elas abertas.
  revalidatePath("/titulo/[id]", "page");
  // Telas que mostram o progresso: Seguintes e biblioteca.
  revalidatePath("/seguintes");
  revalidatePath("/biblioteca");
  return result;
}

async function run(
  useCase: UseCase,
  input: unknown,
): Promise<LibraryActionResult> {
  const result = await runWithValue(useCase, input);
  return result.ok ? { ok: true, value: {} } : result;
}

// A tela da temporada mostra quantos episódios foram marcados e quantos já
// estavam, e usa os ids para o "desfazer".
export async function markSeason(
  input: unknown,
): Promise<
  Result<
    MarkSeasonResult,
    MarkWatchedErrorCode | SetStatusErrorCode | "UNAUTHENTICATED"
  >
> {
  return runWithValue(markSeasonWatched, input);
}

export async function unmarkEpisodes(input: unknown) {
  return run(unmarkEpisodesWatched, input);
}

export async function markEpisode(input: unknown) {
  return run(markEpisodeWatched, input);
}

export async function unmarkEpisode(input: unknown) {
  return run(unmarkEpisodeWatched, input);
}

export async function markMovie(input: unknown) {
  return run(markMovieWatched, input);
}

export async function unmarkMovie(input: unknown) {
  return run(unmarkMovieWatched, input);
}

export async function changeWatchDate(input: unknown) {
  return run(setWatchDate, input);
}

export async function recordEpisodeAgain(input: unknown) {
  return run(rewatchEpisode, input);
}

export async function recordMovieAgain(input: unknown) {
  return run(rewatchMovie, input);
}

export async function removeWatchRecord(input: unknown) {
  return run(deleteWatchRecord, input);
}

export async function changeTitleStatus(input: unknown) {
  return run(setTitleStatus, input);
}

export async function changeTitleHidden(input: unknown) {
  return run(setTitleHidden, input);
}

export async function removeFromLibrary(input: unknown) {
  return run(removeTitleFromLibrary, input);
}

// Atalho "+" da busca: guarda em "Quero ver" um título que talvez ninguém
// tenha aberto ainda (grava no catálogo e na biblioteca numa chamada só).
// O catálogo é gravado fora da transação do usuário, que só abre depois.
export async function addTitleByRef(
  input: unknown,
): Promise<Result<AddByRefResult, AddByRefErrorCode | "UNAUTHENTICATED">> {
  const user = await getCurrentUser();
  if (!user) {
    return fail("UNAUTHENTICATED", "Sua sessão expirou. Entre de novo.");
  }
  const result = await addTitleToLibraryByRef(
    {
      catalog: createCatalogDeps((task) =>
        after(async () => {
          try {
            await task();
          } catch (error) {
            console.error("Falha ao atualizar o cache do catálogo:", error);
          }
        }),
      ),
      inLibrary: (run) =>
        withUser(user.claims, (tx) =>
          run({ library: createLibraryRepository(tx), now: () => new Date() }),
        ),
      allowProviderFetch,
    },
    { id: user.id },
    input,
  );
  if (!result.ok) return result;
  revalidatePath("/titulo/[id]", "page");
  revalidatePath("/seguintes");
  revalidatePath("/biblioteca");
  return result;
}
