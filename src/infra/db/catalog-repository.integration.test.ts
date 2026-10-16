import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import {
  providerTitle,
  searchPage,
  shelfItems,
  watchProviders,
} from "@/domain/catalog/test-fakes";
import { createCatalogStore } from "./catalog-repository";
import {
  asUser,
  closeTestDb,
  createUser,
  inRollback,
} from "./integration-test-utils";
import { episodes, externalIds, providerPayloads, titles } from "./schema";

// Cache do catálogo no banco de desenvolvimento. Usa um provedor fictício
// para não esbarrar em dados do TMDB que já estejam no banco.
afterAll(closeTestDb);

const PROVIDER = "teste";
const EXPIRES = new Date("2030-01-01T00:00:00Z");

describe("catalog store", () => {
  it("grava e lê um título com tradução, gêneros, temporadas e episódios", () =>
    inRollback(async (tx) => {
      const store = createCatalogStore(tx, PROVIDER);
      const id = await store.writeTitle(providerTitle(), EXPIRES);

      expect(
        await store.findTitleByRef({ mediaType: "tv", externalId: "1399" }),
      ).toEqual({ id });

      const read = await store.readTitle(id, "pt-BR");
      expect(read).toEqual({
        expiresAt: EXPIRES,
        value: {
          ref: { mediaType: "tv", externalId: "1399" },
          title: {
            id,
            mediaType: "tv",
            title: "A Guerra dos Tronos",
            originalTitle: "Game of Thrones",
            originalLanguage: "en",
            overview: null,
            releaseDate: "2011-04-17",
            runtime: 60,
            status: "ended",
            posterPath: "/poster.jpg",
            backdropPath: null,
            genres: ["Drama"],
            seasons: [
              {
                id: expect.any(String),
                seasonNumber: 1,
                name: "Temporada 1",
                airDate: "2011-04-17",
                posterPath: null,
                episodeCount: 1,
              },
            ],
          },
        },
      });

      expect(await store.readEpisodes(id, 1)).toEqual([
        {
          id: expect.any(String),
          episodeNumber: 1,
          name: "O Inverno Está Chegando",
          overview: null,
          airDate: "2011-04-17",
          runtime: 62,
        },
      ]);
      expect(await store.readEpisodes(id, 2)).toBeNull();
    }));

  it("sem tradução no idioma pedido, usa o título original", () =>
    inRollback(async (tx) => {
      const store = createCatalogStore(tx, PROVIDER);
      const id = await store.writeTitle(providerTitle(), EXPIRES);
      const read = await store.readTitle(id, "en-US");
      expect(read?.value.title.title).toBe("Game of Thrones");
      expect(read?.value.title.posterPath).toBeNull();
    }));

  it("regravar atualiza no lugar: mesmo uuid, mesmos episódios, novo prazo", () =>
    inRollback(async (tx) => {
      const store = createCatalogStore(tx, PROVIDER);
      const first = providerTitle();
      const id = await store.writeTitle(first, EXPIRES);
      const [episodeBefore] = (await store.readEpisodes(id, 1))!;

      const later = new Date("2031-01-01T00:00:00Z");
      const second = providerTitle({
        status: "canceled",
        genres: [{ externalId: "10765", name: "Ficção" }],
        seasons: [
          {
            ...first.seasons[0],
            episodes: [
              { ...first.seasons[0].episodes[0], name: "Novo nome" },
              {
                episodeNumber: 2,
                name: "Episódio 2",
                overview: null,
                airDate: null,
                runtime: null,
              },
            ],
          },
        ],
      });
      expect(await store.writeTitle(second, later)).toBe(id);

      const read = await store.readTitle(id, "pt-BR");
      expect(read?.expiresAt).toEqual(later);
      expect(read?.value.title.status).toBe("canceled");
      expect(read?.value.title.genres).toEqual(["Ficção"]);
      const after = (await store.readEpisodes(id, 1))!;
      expect(after.map((e) => [e.id, e.name])).toEqual([
        [episodeBefore.id, "Novo nome"],
        [expect.any(String), "Episódio 2"],
      ]);

      const ids = await tx
        .select()
        .from(externalIds)
        .where(eq(externalIds.provider, PROVIDER));
      expect(ids.filter((r) => r.entityType === "tv")).toHaveLength(1);
    }));

  it("reaproveita o gênero entre títulos", () =>
    inRollback(async (tx) => {
      const store = createCatalogStore(tx, PROVIDER);
      await store.writeTitle(providerTitle(), EXPIRES);
      await store.writeTitle(
        providerTitle({
          ref: { mediaType: "movie", externalId: "1399" },
          seasons: [],
        }),
        EXPIRES,
      );
      const genreIds = await tx
        .select()
        .from(externalIds)
        .where(eq(externalIds.provider, PROVIDER));
      expect(genreIds.filter((r) => r.entityType === "genre")).toHaveLength(1);
      // Filme e série com o mesmo número no TMDB são títulos diferentes.
      expect(genreIds.filter((r) => r.entityType !== "genre")).toHaveLength(2);
    }));

  it("adia a próxima atualização de um título gravado", () =>
    inRollback(async (tx) => {
      const store = createCatalogStore(tx, PROVIDER);
      const id = await store.writeTitle(providerTitle(), EXPIRES);
      const later = new Date("2032-01-01T00:00:00Z");
      await store.postponeTitle({ mediaType: "tv", externalId: "1399" }, later);
      expect((await store.readTitle(id, "pt-BR"))?.expiresAt).toEqual(later);
      // Sem efeito para título que não está no banco.
      await store.postponeTitle({ mediaType: "movie", externalId: "1" }, later);
    }));

  it("o payload guarda o título sem os episódios", () =>
    inRollback(async (tx) => {
      const store = createCatalogStore(tx, PROVIDER);
      await store.writeTitle(providerTitle(), EXPIRES);
      const [row] = await tx
        .select()
        .from(providerPayloads)
        .where(eq(providerPayloads.provider, PROVIDER));
      expect(row.resource).toBe("tv/1399");
      expect(JSON.stringify(row.payload)).not.toContain("O Inverno");
    }));

  it("grava, lê e substitui buscas", () =>
    inRollback(async (tx) => {
      const store = createCatalogStore(tx, PROVIDER);
      const key = "search:pt-BR:1:got";
      expect(await store.readSearch(key)).toBeNull();
      await store.writeSearch(key, searchPage("Antigo"), EXPIRES);
      await store.writeSearch(key, searchPage(), EXPIRES);
      expect(await store.readSearch(key)).toEqual({
        value: searchPage(),
        expiresAt: EXPIRES,
      });
    }));

  it("grava, lê e substitui prateleiras", () =>
    inRollback(async (tx) => {
      const store = createCatalogStore(tx, PROVIDER);
      const key = "shelf:pt-BR:BR:trending";
      expect(await store.readShelf(key)).toBeNull();
      await store.writeShelf(key, shelfItems(1), EXPIRES);
      await store.writeShelf(key, shelfItems(2), EXPIRES);
      expect(await store.readShelf(key)).toEqual({
        value: shelfItems(2),
        expiresAt: EXPIRES,
      });
    }));

  it("grava, lê e substitui onde assistir", () =>
    inRollback(async (tx) => {
      const store = createCatalogStore(tx, PROVIDER);
      const key = "providers:BR:tv/1399";
      expect(await store.readWatchProviders(key)).toBeNull();
      await store.writeWatchProviders(
        key,
        watchProviders({ flatrate: [] }),
        EXPIRES,
      );
      await store.writeWatchProviders(key, watchProviders(), EXPIRES);
      expect(await store.readWatchProviders(key)).toEqual({
        value: watchProviders(),
        expiresAt: EXPIRES,
      });
    }));
});

describe("RLS do catálogo", () => {
  it("authenticated lê títulos e episódios, mas não escreve nem vê o cache", () =>
    inRollback(async (tx) => {
      const store = createCatalogStore(tx, PROVIDER);
      const id = await store.writeTitle(providerTitle(), EXPIRES);
      const user = await createUser(tx);

      await asUser(tx, user, async (utx) => {
        const seen = await utx.select().from(titles).where(eq(titles.id, id));
        expect(seen).toHaveLength(1);
        const eps = await utx.select({ id: episodes.id }).from(episodes);
        expect(eps.length).toBeGreaterThan(0);

        expect(await utx.select().from(providerPayloads)).toHaveLength(0);
        expect(await utx.select().from(externalIds)).toHaveLength(0);

        const updated = await utx
          .update(titles)
          .set({ originalTitle: "Invasor" })
          .where(eq(titles.id, id))
          .returning({ id: titles.id });
        expect(updated).toHaveLength(0);
      });

      await expect(
        asUser(tx, user, (utx) =>
          utx.insert(titles).values({ mediaType: "movie", originalTitle: "X" }),
        ),
      ).rejects.toEqual(
        expect.objectContaining({
          cause: expect.objectContaining({ code: "42501" }),
        }),
      );
    }));

  it("anon não lê o catálogo direto do banco", () =>
    inRollback(async (tx) => {
      const store = createCatalogStore(tx, PROVIDER);
      await store.writeTitle(providerTitle(), EXPIRES);
      const rows = await tx.transaction(async (sp) => {
        await sp.execute(sql`set local role anon`);
        return sp.select().from(titles);
      });
      expect(rows).toHaveLength(0);
    }));
});
