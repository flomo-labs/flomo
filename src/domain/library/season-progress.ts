// Progresso por temporada para a sanfona da página do título (#255).
// Mesma regra de `markSeasonWatched`: só entram em "faltam" os episódios já
// lançados (ou sem data no catálogo).

export type SeasonProgressInput = {
  seasonNumber: number;
  episodes: { id: string; airDate: string | null }[];
};

export type SeasonProgress = {
  seasonNumber: number;
  // Episódios vistos da temporada e total da temporada.
  watched: number;
  total: number;
  // Lançados ainda não vistos. Zero = nada a marcar na temporada.
  missing: number;
  // Lançados que já estavam vistos.
  watchedReleased: number;
  // Ids vistos, para "Desfazer temporada".
  watchedIds: string[];
  // O mesmo, somando as temporadas regulares de 1 até esta ("marcar até").
  missingThrough: number;
  watchedReleasedThrough: number;
};

// `seasons` em ordem crescente, só as regulares (de 1 em diante).
export function computeSeasonProgress(
  seasons: readonly SeasonProgressInput[],
  watched: ReadonlySet<string>,
  today: string,
): SeasonProgress[] {
  let missingThrough = 0;
  let watchedReleasedThrough = 0;
  return seasons.map(({ seasonNumber, episodes }) => {
    const released = episodes.filter((e) => !e.airDate || e.airDate <= today);
    const watchedReleased = released.filter((e) => watched.has(e.id)).length;
    const missing = released.length - watchedReleased;
    missingThrough += missing;
    watchedReleasedThrough += watchedReleased;
    const watchedIds = episodes
      .filter((e) => watched.has(e.id))
      .map((e) => e.id);
    return {
      seasonNumber,
      watched: watchedIds.length,
      total: episodes.length,
      missing,
      watchedReleased,
      watchedIds,
      missingThrough,
      watchedReleasedThrough,
    };
  });
}
