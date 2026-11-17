import { sql } from "drizzle-orm";
import type { PeopleSearchRepository } from "@/domain/people-search/ports";
import type { Tx } from "./client";

type Row = {
  profile_id: string;
  handle: string;
  display_name: string | null;
  avatar_url: string | null;
  rank: number;
};

// Pela função `app.search_people` (migration 0030): a policy de `profiles`
// esconde perfil privado, e a função devolve só nome, handle e foto, aplicando
// bloqueio, o próprio usuário e o mínimo de caracteres.
export function createPeopleSearchRepository(tx: Tx): PeopleSearchRepository {
  return {
    async search(query, { limit, after }) {
      const rows = await tx.execute<Row>(
        sql`select * from app.search_people(${query}::text, ${limit}::integer, ${after?.rank ?? null}::integer, ${after?.handle ?? null}::text)`,
      );
      return [...rows].map((r) => ({
        profileId: r.profile_id,
        handle: r.handle,
        displayName: r.display_name,
        avatarUrl: r.avatar_url,
        rank: r.rank,
      }));
    },
  };
}
