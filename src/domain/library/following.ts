import { CATALOG_COUNTRY, CATALOG_LOCALE } from "../catalog/types";
import { ok, type Result } from "../result";
import type { AuthenticatedUser } from "../user";
import type { LibraryDeps } from "./mark-watched";
import type { FollowingItem } from "./ports";
import { todayIn } from "./watch-date";

export const FOLLOWING_LIMIT = 50;

// "Seguintes": a fila do que assistir em seguida, filmes e séries juntos.
export async function listFollowing(
  deps: LibraryDeps,
  user: AuthenticatedUser,
): Promise<Result<FollowingItem[], never>> {
  return ok(
    await deps.library.listFollowing(
      user.id,
      CATALOG_LOCALE,
      todayIn(CATALOG_COUNTRY, deps.now()),
      FOLLOWING_LIMIT,
    ),
  );
}
