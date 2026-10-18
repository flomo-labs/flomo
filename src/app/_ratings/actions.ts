"use server";

import { revalidatePath } from "next/cache";
import { fail, type Result } from "@/domain/result";
import { deleteRating, setRating, type RateErrorCode } from "@/domain/rating/rate";
import { withUser } from "@/infra/db/client";
import { createLibraryRepository } from "@/infra/db/library-repository";
import { createRatingRepository } from "@/infra/db/rating-repository";
import { getCurrentUser } from "../_auth/session";

// Camada fina (ADR-004): resolve o usuário, chama o caso de uso dentro do
// `withUser` (RLS) e atualiza a página do título. A regra fica em
// domain/rating/rate.ts. Cada ação confere o login por conta própria:
// Server Actions aceitam POST direto, não só os botões da tela.

export type RatingActionResult = Result<
  Record<string, never>,
  RateErrorCode | "UNAUTHENTICATED"
>;

type UseCase = (
  deps: {
    ratings: ReturnType<typeof createRatingRepository>;
    library: ReturnType<typeof createLibraryRepository>;
  },
  user: { id: string },
  input: unknown,
) => Promise<Result<unknown, RateErrorCode>>;

async function run(
  useCase: UseCase,
  input: unknown,
): Promise<RatingActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return fail("UNAUTHENTICATED", "Sua sessão expirou. Entre de novo.");
  }
  const result = await withUser(user.claims, (tx) =>
    useCase(
      {
        ratings: createRatingRepository(tx),
        library: createLibraryRepository(tx),
      },
      { id: user.id },
      input,
    ),
  );
  if (!result.ok) return result;
  revalidatePath("/titulo/[id]", "page");
  return { ok: true, value: {} };
}

export async function rateItem(input: unknown) {
  return run(setRating, input);
}

export async function removeRating(input: unknown) {
  return run(deleteRating, input);
}
