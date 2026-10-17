import { describe, expect, it } from "vitest";
import { listFollowing } from "./following";
import { markEpisodeWatched } from "./mark-watched";
import { createFakeLibrary, type FakeEpisode, USER } from "./test-fakes";

const SERIES = "aaaaaaaa-0000-4000-8000-000000000001";
const MOVIE = "aaaaaaaa-0000-4000-8000-000000000002";
const OTHER = "aaaaaaaa-0000-4000-8000-000000000003";

function episode(
  n: number,
  airDate: string | null,
  titleId = SERIES,
): FakeEpisode {
  return {
    id: `bbbbbbbb-0000-4000-8000-${titleId.slice(-2)}00000001${String(n).padStart(2, "0")}`,
    titleId,
    seasonNumber: 1,
    episodeNumber: n,
    airDate,
  };
}
const [E1, E2, E3, E4] = [
  episode(1, "2020-01-01"),
  episode(2, "2020-01-08"),
  episode(3, "2020-01-15"),
  episode(4, "2099-01-01"),
];
const O1 = episode(1, "2020-01-01", OTHER);

function setup() {
  return createFakeLibrary({
    titles: { [SERIES]: "tv", [MOVIE]: "movie", [OTHER]: "tv" },
    episodes: [E1, E2, E3, E4, O1],
  });
}

async function queue(lib: ReturnType<typeof setup>) {
  const result = await listFollowing(lib.deps, USER);
  return result.ok
    ? result.value.map((i) => i.next?.episodeId ?? i.titleId)
    : null;
}

describe("seguintes", () => {
  it("série em Assistindo mostra o episódio seguinte ao mais avançado visto", async () => {
    const lib = setup();
    await markEpisodeWatched(lib.deps, USER, { episodeId: E2.id });
    expect(await queue(lib)).toEqual([E3.id]);
  });

  it("série em Quero ver mostra o primeiro episódio", async () => {
    const lib = setup();
    lib.setStatus(SERIES, "watchlist");
    expect(await queue(lib)).toEqual([E1.id]);
  });

  it("filme em Quero ver aparece inteiro; assistido sai", async () => {
    const lib = setup();
    lib.setStatus(MOVIE, "watchlist");
    expect(await queue(lib)).toEqual([MOVIE]);
    lib.setStatus(MOVIE, "watched");
    expect(await queue(lib)).toEqual([]);
  });

  it("série em dia (só falta episódio futuro) sai da fila", async () => {
    const lib = setup();
    await markEpisodeWatched(lib.deps, USER, {
      episodeId: E3.id,
      includePrevious: true,
    });
    expect(await queue(lib)).toEqual([]);
  });

  it("Pausado, Abandonado e oculto ficam de fora", async () => {
    const lib = setup();
    lib.setStatus(SERIES, "watchlist");
    lib.setStatus(OTHER, "paused");
    expect(await queue(lib)).toEqual([E1.id]);
    lib.setStatus(OTHER, "dropped");
    expect(await queue(lib)).toEqual([E1.id]);
    await lib.deps.library.setTitleHidden(USER.id, SERIES, true);
    expect(await queue(lib)).toEqual([]);
  });
});
