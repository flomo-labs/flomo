// TMDB falso para o E2E: responde só o que o fluxo do spike usa, com dados
// inventados (nada copiado do TMDB). O app aponta para cá com TMDB_BASE_URL.
// Rodado pelo Playwright (playwright.config.ts); porta em TMDB_FAKE_PORT.
import { createServer } from "node:http";

const PORT = Number(process.env.TMDB_FAKE_PORT ?? 3999);

const SERIES = {
  id: 900001,
  name: "Série de Teste do Flomo",
  original_name: "Flomo Test Series",
};
const MOVIE = {
  id: 900002,
  title: "Filme de Teste do Flomo",
  original_title: "Flomo Test Movie",
};

const EPISODES = [1, 2, 3].map((n) => ({
  episode_number: n,
  name: `Episódio ${n}`,
  overview: `Resumo inventado do episódio ${n}.`,
  air_date: `2024-01-0${n}`,
  runtime: 45,
}));

const seriesDetails = {
  ...SERIES,
  original_language: "pt",
  first_air_date: "2024-01-01",
  episode_run_time: [45],
  status: "Ended",
  overview: "Série inventada para os testes de ponta a ponta.",
  poster_path: null,
  backdrop_path: null,
  vote_average: 7.5,
  vote_count: 10,
  genres: [{ id: 18, name: "Drama" }],
  seasons: [{ season_number: 1 }],
};

const season1 = {
  season_number: 1,
  name: "Temporada 1",
  overview: "",
  air_date: "2024-01-01",
  poster_path: null,
  episodes: EPISODES,
};

const movieDetails = {
  ...MOVIE,
  original_language: "pt",
  release_date: "2024-02-01",
  runtime: 100,
  status: "Released",
  overview: "Filme inventado para os testes de ponta a ponta.",
  poster_path: null,
  backdrop_path: null,
  vote_average: 6.8,
  vote_count: 20,
  genres: [{ id: 35, name: "Comédia" }],
};

const emptyList = { page: 1, total_pages: 1, total_results: 0, results: [] };

function route(url) {
  const path = url.pathname.replace(/^\/3\//, "");
  if (path === "search/multi") {
    const query = (url.searchParams.get("query") ?? "").toLowerCase();
    if (!query.includes("flomo")) return emptyList;
    return {
      page: 1,
      total_pages: 1,
      total_results: 2,
      results: [
        { media_type: "tv", ...seriesDetails },
        { media_type: "movie", ...movieDetails },
      ],
    };
  }
  if (path === `tv/${SERIES.id}`) {
    const append = url.searchParams.get("append_to_response") ?? "";
    return append.includes("season/1")
      ? { ...seriesDetails, "season/1": season1 }
      : seriesDetails;
  }
  if (path === `movie/${MOVIE.id}`) return movieDetails;
  if (path.endsWith("/watch/providers")) return { id: 0, results: {} };
  // Prateleiras do Descobrir (trending, now_playing, discover): vazias.
  if (/^(trending|movie\/now_playing|discover)\b/.test(path)) return emptyList;
  return null;
}

createServer((req, res) => {
  const body = route(new URL(req.url ?? "/", `http://localhost:${PORT}`));
  res.writeHead(body === null ? 404 : 200, {
    "content-type": "application/json",
  });
  res.end(JSON.stringify(body ?? { success: false, status_code: 34 }));
}).listen(PORT, () => {
  console.log(`TMDB falso em http://localhost:${PORT}/3`);
});
