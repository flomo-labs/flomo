import "server-only";
import { cache } from "react";
import {
  getMyRatings,
  getTitleRatingSummary,
} from "@/domain/rating/rate";
import type { UserRating } from "@/domain/rating/ports";
import type { TitleRatingSummary } from "@/domain/rating/summary";
import { getDb, withUser } from "@/infra/db/client";
import { createRatingRepository } from "@/infra/db/rating-repository";
import { getCurrentUser } from "../_auth/session";

// Notas do usuário no título, lidas uma vez por requisição (cada episódio da
// lista consulta o mesmo valor). `null` sem login ou se não der para ler.
export const getUserRatings = cache(
  async (titleId: string): Promise<UserRating[] | null> => {
    const user = await getCurrentUser();
    if (!user) return null;
    try {
      const result = await withUser(user.claims, (tx) =>
        getMyRatings({ ratings: createRatingRepository(tx) }, { id: user.id }, {
          titleId,
        }),
      );
      return result.ok ? result.value : null;
    } catch (error) {
      console.error("Falha ao ler as notas:", error);
      return null;
    }
  },
);

// Médias de todos os usuários, também para quem não entrou. `null` se não der
// para ler: a tela só omite a média.
export const getRatingSummary = cache(
  async (titleId: string): Promise<TitleRatingSummary | null> => {
    try {
      const result = await getTitleRatingSummary(
        { ratings: createRatingRepository(getDb()) },
        { titleId },
      );
      return result.ok ? result.value : null;
    } catch (error) {
      console.error("Falha ao ler as médias:", error);
      return null;
    }
  },
);
