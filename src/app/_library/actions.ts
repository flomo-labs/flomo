"use server";

import { revalidatePath } from "next/cache";
import {
  deleteWatchRecord,
  markEpisodeWatched,
  markMovieWatched,
  rewatchEpisode,
  rewatchMovie,
  setWatchDate,
  unmarkEpisodeWatched,
  unmarkMovieWatched,
  type MarkWatchedErrorCode,
} from "@/domain/library/mark-watched";
import {
  removeTitleFromLibrary,
  setTitleHidden,
  setTitleStatus,
  type SetStatusErrorCode,
} from "@/domain/library/set-status";
import { fail, type Result } from "@/domain/result";
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

async function run(
  useCase: UseCase,
  input: unknown,
): Promise<LibraryActionResult> {
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
  return { ok: true, value: {} };
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
