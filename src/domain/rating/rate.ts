import {
  deleteRatingInputSchema,
  setRatingInputSchema,
  titleRatingsInputSchema,
} from "@/contracts/rating";
import { fail, ok, type Result } from "../result";
import type { AuthenticatedUser } from "../user";
import type { RatingDeps, UserRating } from "./ports";
import { summarizeRatings, type TitleRatingSummary } from "./summary";

// Dar, trocar e apagar nota e ler notas e médias (Fase 1.5). Regras em
// docs/regras-de-negocio.md, seção Avaliações. Cada caso de uso roda numa
// transação só (o `withUser` da borda).

export type RateErrorCode =
  | "INVALID_INPUT"
  | "TITLE_NOT_FOUND"
  | "EPISODE_NOT_FOUND"
  | "NOT_RATABLE"
  | "NOT_WATCHED";

// Dar ou trocar a nota exige o item assistido: filme com algum registro no
// histórico, episódio visto. Série e temporada não têm nota própria.
export async function setRating(
  deps: RatingDeps,
  user: AuthenticatedUser,
  input: unknown,
): Promise<Result<Record<string, never>, RateErrorCode>> {
  const parsed = setRatingInputSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "Dados inválidos.");
  const data = parsed.data;

  if ("episodeId" in data) {
    const episode = await deps.library.findEpisode(data.episodeId);
    if (!episode) return fail("EPISODE_NOT_FOUND", "Episódio não encontrado.");
    if (!(await deps.library.hasEpisodeProgress(user.id, data.episodeId))) {
      return fail("NOT_WATCHED", "Marque o episódio como assistido para dar nota.");
    }
    await deps.ratings.upsertEpisodeRating(
      user.id,
      episode.titleId,
      data.episodeId,
      data.halfStars,
    );
    return ok({});
  }

  const mediaType = await deps.library.findTitleMediaType(data.titleId);
  if (!mediaType) return fail("TITLE_NOT_FOUND", "Título não encontrado.");
  if (mediaType !== "movie") {
    return fail("NOT_RATABLE", "Séries e temporadas não recebem nota; avalie os episódios.");
  }
  if (!(await deps.library.hasMovieEvent(user.id, data.titleId))) {
    return fail("NOT_WATCHED", "Marque o filme como assistido para dar nota.");
  }
  await deps.ratings.upsertMovieRating(user.id, data.titleId, data.halfStars);
  return ok({});
}

// Apagar vale sempre (também com o item desmarcado) e não falha se não há nota.
export async function deleteRating(
  deps: RatingDeps,
  user: AuthenticatedUser,
  input: unknown,
): Promise<Result<Record<string, never>, "INVALID_INPUT">> {
  const parsed = deleteRatingInputSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "Dados inválidos.");
  const data = parsed.data;
  if ("episodeId" in data) {
    await deps.ratings.deleteEpisodeRating(user.id, data.episodeId);
  } else {
    await deps.ratings.deleteMovieRating(user.id, data.titleId);
  }
  return ok({});
}

// Notas do usuário no título, para a tela mostrar o que ele já deu.
export async function getMyRatings(
  deps: Pick<RatingDeps, "ratings">,
  user: AuthenticatedUser,
  input: unknown,
): Promise<Result<UserRating[], "INVALID_INPUT">> {
  const parsed = titleRatingsInputSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "Título inválido.");
  return ok(await deps.ratings.listUserRatings(user.id, parsed.data.titleId));
}

// Médias do título somando todos os usuários. Pública: não identifica ninguém.
export async function getTitleRatingSummary(
  deps: Pick<RatingDeps, "ratings">,
  input: unknown,
): Promise<Result<TitleRatingSummary, "INVALID_INPUT">> {
  const parsed = titleRatingsInputSchema.safeParse(input);
  if (!parsed.success) return fail("INVALID_INPUT", "Título inválido.");
  return ok(summarizeRatings(await deps.ratings.summarizeTitle(parsed.data.titleId)));
}
