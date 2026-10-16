import "server-only";
import { cache } from "react";
import { getTitleLibraryState } from "@/domain/library/get-title-state";
import type { TitleLibraryState } from "@/domain/library/ports";
import { withUser } from "@/infra/db/client";
import { createLibraryRepository } from "@/infra/db/library-repository";
import { getCurrentUser } from "../_auth/session";

// Estado do usuário no título, lido uma vez por requisição (cada episódio da
// lista consulta o mesmo valor).
export type LibraryStateView =
  | { kind: "anonymous" }
  | { kind: "unavailable" }
  | { kind: "ok"; state: TitleLibraryState };

export const getLibraryState = cache(
  async (titleId: string): Promise<LibraryStateView> => {
    const user = await getCurrentUser();
    if (!user) return { kind: "anonymous" };
    try {
      const result = await withUser(user.claims, (tx) =>
        getTitleLibraryState(
          { library: createLibraryRepository(tx) },
          { id: user.id },
          { titleId },
        ),
      );
      return result.ok
        ? { kind: "ok", state: result.value }
        : { kind: "unavailable" };
    } catch (error) {
      console.error("Falha ao ler a biblioteca:", error);
      return { kind: "unavailable" };
    }
  },
);
