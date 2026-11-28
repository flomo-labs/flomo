import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import {
  clearRecentSearches,
  listRecentSearches,
  recordRecentSearch,
  removeRecentSearch,
} from "@/domain/recent-search/recent-search";
import type { RecentSearchItem } from "@/domain/recent-search/ports";
import type { Tx } from "./client";
import {
  asUser,
  closeTestDb,
  createUser,
  inRollback,
} from "./integration-test-utils";
import { createRecentSearchRepository } from "./recent-search-repository";
import { blocks, profiles, recentSearches } from "./schema";

// Exercita a migration 0037: tabela `recent_searches` (RLS só do dono, máximo
// de 8, repetição, formato e cascata) e as funções `app.recent_searches`,
// `app.find_recent_search_person` e `app.delete_recent_search_person`.
afterAll(closeTestDb);

const INSUFFICIENT_PRIVILEGE = "42501";
const CHECK_VIOLATION = "23514";
const UNIQUE_VIOLATION = "23505";

function pgError(code: string) {
  return expect.objectContaining({
    cause: expect.objectContaining({ code }),
  });
}

const deps = (tx: Tx) => ({
  recentSearches: createRecentSearchRepository(tx),
});

// Pessoa com handle definitivo (o de quem acabou de entrar é provisório).
async function createPerson(tx: Tx, displayName: string | null = "Ana Teste") {
  const id = await createUser(tx);
  const handle = `t${id.replaceAll("-", "").slice(0, 12)}`;
  await tx
    .update(profiles)
    .set({ handle, displayName })
    .where(eq(profiles.id, id));
  return { id, handle };
}

const record = (tx: Tx, me: string, input: unknown) =>
  asUser(tx, me, (t) => recordRecentSearch(deps(t), { id: me }, input));
const remove = (tx: Tx, me: string, input: unknown) =>
  asUser(tx, me, (t) => removeRecentSearch(deps(t), { id: me }, input));
const clear = (tx: Tx, me: string) =>
  asUser(tx, me, (t) => clearRecentSearches(deps(t), { id: me }));
const list = async (tx: Tx, me: string): Promise<RecentSearchItem[]> => {
  const result = await asUser(tx, me, (t) =>
    listRecentSearches(deps(t), { id: me }),
  );
  if (!result.ok) throw new Error("listar não devia falhar");
  return result.value.items;
};

const query = (term: string) => ({ kind: "query" as const, term });
const title = (externalId: string, name = `Filme ${externalId}`) => ({
  kind: "title" as const,
  mediaType: "movie" as const,
  externalId,
  title: name,
  year: "2020",
  posterPath: "/abc123.jpg",
});

describe("recent_searches: acesso", () => {
  it("anônimo não toca na tabela nem nas funções", () =>
    inRollback(async (tx) => {
      await expect(
        tx.transaction(async (sp) => {
          await sp.execute(sql`set local role anon`);
          await sp.select().from(recentSearches);
        }),
      ).rejects.toEqual(pgError(INSUFFICIENT_PRIVILEGE));
      await expect(
        tx.transaction(async (sp) => {
          await sp.execute(sql`set local role anon`);
          await sp.execute(sql`select * from app.recent_searches()`);
        }),
      ).rejects.toEqual(pgError(INSUFFICIENT_PRIVILEGE));
    }));

  it("sem usuário na sessão (visitante com papel authenticated) a lista é vazia", () =>
    inRollback(async (tx) => {
      const me = await createUser(tx);
      await record(tx, me, query("dark"));
      const rows = await tx.transaction(async (sp) => {
        await sp.execute(sql`set local role authenticated`);
        return [
          ...(await sp.execute(sql`select * from app.recent_searches()`)),
        ];
      });
      expect(rows).toEqual([]);
    }));

  it("cada pessoa só lê e muda as próprias linhas", () =>
    inRollback(async (tx) => {
      const [a, b] = [await createUser(tx), await createUser(tx)];
      await record(tx, a, query("dark"));
      await record(tx, b, query("lost"));

      expect(await list(tx, a)).toEqual([{ kind: "query", term: "dark" }]);
      expect(await list(tx, b)).toEqual([{ kind: "query", term: "lost" }]);

      const seenByB = await asUser(tx, b, (t) =>
        t.select({ term: recentSearches.term }).from(recentSearches),
      );
      expect(seenByB).toEqual([{ term: "lost" }]);

      // B não apaga nem altera a linha de A, e não grava em nome dele.
      await asUser(tx, b, (t) =>
        t.delete(recentSearches).where(eq(recentSearches.userId, a)),
      );
      await asUser(tx, b, (t) =>
        t
          .update(recentSearches)
          .set({ usedAt: new Date(0) })
          .where(eq(recentSearches.userId, a)),
      );
      expect(await list(tx, a)).toEqual([{ kind: "query", term: "dark" }]);
      await expect(
        asUser(tx, b, (t) =>
          t
            .insert(recentSearches)
            .values({ userId: a, kind: "query", term: "forjado" }),
        ),
      ).rejects.toEqual(pgError(INSUFFICIENT_PRIVILEGE));
    }));

  it("a lista nunca devolve item de outra pessoa, mesmo igual ao dela", () =>
    inRollback(async (tx) => {
      const [a, b] = [await createUser(tx), await createUser(tx)];
      const ana = await createPerson(tx);
      await record(tx, a, { kind: "person", handle: ana.handle });
      await record(tx, a, title("603"));
      expect(await list(tx, b)).toEqual([]);
    }));
});

describe("recent_searches: regras", () => {
  it("lista do mais novo para o mais antigo", () =>
    inRollback(async (tx) => {
      const me = await createUser(tx);
      await record(tx, me, query("um"));
      await record(tx, me, query("dois"));
      await record(tx, me, query("tres"));
      expect(await list(tx, me)).toEqual([
        { kind: "query", term: "tres" },
        { kind: "query", term: "dois" },
        { kind: "query", term: "um" },
      ]);
    }));

  it("guarda no máximo 8: o 9º tira o mais antigo", () =>
    inRollback(async (tx) => {
      const me = await createUser(tx);
      for (let i = 1; i <= 9; i++) await record(tx, me, query(`busca ${i}`));
      const items = await list(tx, me);
      expect(items).toHaveLength(8);
      expect(items[0]).toEqual({ kind: "query", term: "busca 9" });
      expect(items[7]).toEqual({ kind: "query", term: "busca 2" });
      const stored = await tx
        .select()
        .from(recentSearches)
        .where(eq(recentSearches.userId, me));
      expect(stored).toHaveLength(8);
    }));

  it("o máximo vale por pessoa: o histórico de outra não é tocado", () =>
    inRollback(async (tx) => {
      const [a, b] = [await createUser(tx), await createUser(tx)];
      await record(tx, b, query("de b"));
      for (let i = 1; i <= 10; i++) await record(tx, a, query(`busca ${i}`));
      expect(await list(tx, b)).toEqual([{ kind: "query", term: "de b" }]);
    }));

  it("o banco também limita a 8 quando o registro vem direto", () =>
    inRollback(async (tx) => {
      const me = await createUser(tx);
      for (let i = 1; i <= 12; i++) {
        await tx
          .insert(recentSearches)
          .values({ userId: me, kind: "query", term: `direto ${i}` });
      }
      const stored = await tx
        .select({ term: recentSearches.term })
        .from(recentSearches)
        .where(eq(recentSearches.userId, me));
      expect(stored).toHaveLength(8);
      expect(stored.map((r) => r.term)).not.toContain("direto 4");
      expect(stored.map((r) => r.term)).toContain("direto 5");
    }));

  it("termo repetido (sem diferenciar maiúsculas) vira um só, no topo, com a última grafia", () =>
    inRollback(async (tx) => {
      const me = await createUser(tx);
      await record(tx, me, query("dark"));
      await record(tx, me, query("lost"));
      await record(tx, me, query("DARK"));
      expect(await list(tx, me)).toEqual([
        { kind: "query", term: "DARK" },
        { kind: "query", term: "lost" },
      ]);
    }));

  it("repetir um item com o histórico cheio não tira ninguém", () =>
    inRollback(async (tx) => {
      const me = await createUser(tx);
      for (let i = 1; i <= 8; i++) await record(tx, me, query(`busca ${i}`));
      await record(tx, me, query("busca 1"));
      const items = await list(tx, me);
      expect(items).toHaveLength(8);
      expect(items[0]).toEqual({ kind: "query", term: "busca 1" });
    }));

  it("título repetido vai ao topo e atualiza o que a lista mostra", () =>
    inRollback(async (tx) => {
      const me = await createUser(tx);
      await record(tx, me, title("603", "Matrix"));
      await record(tx, me, query("lost"));
      await record(tx, me, { ...title("603", "The Matrix"), year: null });
      expect(await list(tx, me)).toEqual([
        {
          kind: "title",
          mediaType: "movie",
          externalId: "603",
          title: "The Matrix",
          year: null,
          posterPath: "/abc123.jpg",
        },
        { kind: "query", term: "lost" },
      ]);
    }));

  it("filme e série com o mesmo id do provedor são itens diferentes", () =>
    inRollback(async (tx) => {
      const me = await createUser(tx);
      await record(tx, me, title("603"));
      await record(tx, me, { ...title("603"), mediaType: "tv" });
      expect(await list(tx, me)).toHaveLength(2);
    }));

  it("remove um item (termo sem diferenciar maiúsculas) e não falha se não há", () =>
    inRollback(async (tx) => {
      const me = await createUser(tx);
      await record(tx, me, query("Dark"));
      await record(tx, me, title("603"));
      expect(await remove(tx, me, query("dark"))).toMatchObject({ ok: true });
      expect(await remove(tx, me, query("dark"))).toMatchObject({ ok: true });
      expect(
        await remove(tx, me, {
          kind: "title",
          mediaType: "movie",
          externalId: "603",
        }),
      ).toMatchObject({ ok: true });
      expect(await list(tx, me)).toEqual([]);
    }));

  it("remover não apaga o item igual de outra pessoa", () =>
    inRollback(async (tx) => {
      const [a, b] = [await createUser(tx), await createUser(tx)];
      await record(tx, a, query("dark"));
      await record(tx, b, query("dark"));
      await remove(tx, a, query("dark"));
      expect(await list(tx, a)).toEqual([]);
      expect(await list(tx, b)).toEqual([{ kind: "query", term: "dark" }]);
    }));

  it("limpar apaga todos os itens da pessoa e só os dela", () =>
    inRollback(async (tx) => {
      const [a, b] = [await createUser(tx), await createUser(tx)];
      const ana = await createPerson(tx);
      await record(tx, a, query("dark"));
      await record(tx, a, title("603"));
      await record(tx, a, { kind: "person", handle: ana.handle });
      await record(tx, b, query("dark"));
      await clear(tx, a);
      expect(await list(tx, a)).toEqual([]);
      expect(await list(tx, b)).toHaveLength(1);
    }));
});

describe("recent_searches: pessoas", () => {
  it("guarda o perfil e mostra o nome e o handle de agora", () =>
    inRollback(async (tx) => {
      const me = await createUser(tx);
      const ana = await createPerson(tx, "Ana Teste");
      await record(tx, me, { kind: "person", handle: ana.handle });
      expect(await list(tx, me)).toEqual([
        { kind: "person", handle: ana.handle, displayName: "Ana Teste" },
      ]);

      // Trocou o nome e o handle: a lista acompanha, sem cópia velha.
      const newHandle = `${ana.handle}x`;
      await tx
        .update(profiles)
        .set({ displayName: "Ana Nova", handle: newHandle })
        .where(eq(profiles.id, ana.id));
      expect(await list(tx, me)).toEqual([
        { kind: "person", handle: newHandle, displayName: "Ana Nova" },
      ]);
    }));

  it("perfil privado entra (nome e handle já são visíveis a quem entrou)", () =>
    inRollback(async (tx) => {
      const me = await createUser(tx);
      const ana = await createPerson(tx);
      await tx
        .update(profiles)
        .set({ isPrivate: true })
        .where(eq(profiles.id, ana.id));
      expect(
        await record(tx, me, { kind: "person", handle: ana.handle }),
      ).toMatchObject({ ok: true });
      expect(await list(tx, me)).toHaveLength(1);
    }));

  it("recusa a si mesmo, pessoa que não existe e handle provisório", () =>
    inRollback(async (tx) => {
      const me = await createPerson(tx);
      const provisional = await createUser(tx);
      const [{ handle: provisionalHandle }] = await tx
        .select({ handle: profiles.handle })
        .from(profiles)
        .where(eq(profiles.id, provisional));
      for (const handle of [me.handle, "ninguem.aqui", provisionalHandle]) {
        expect(
          await record(tx, me.id, { kind: "person", handle }),
        ).toMatchObject({ ok: false });
      }
      expect(
        await record(tx, me.id, { kind: "person", handle: "ninguem.aqui" }),
      ).toMatchObject({ ok: false, error: { code: "PERSON_NOT_FOUND" } });
      expect(await list(tx, me.id)).toEqual([]);
    }));

  it("quem bloqueou não registra, e quem foi bloqueado recebe a mesma resposta de perfil inexistente", () =>
    inRollback(async (tx) => {
      const [me, ana] = [await createPerson(tx), await createPerson(tx)];
      await asUser(tx, me.id, (t) =>
        t.insert(blocks).values({ blockerId: me.id, blockedId: ana.id }),
      );
      // Nos dois sentidos, o resultado é o de uma pessoa que não existe.
      const byBlocker = await record(tx, me.id, {
        kind: "person",
        handle: ana.handle,
      });
      const byBlocked = await record(tx, ana.id, {
        kind: "person",
        handle: me.handle,
      });
      const unknown = await record(tx, me.id, {
        kind: "person",
        handle: "ninguem.aqui",
      });
      expect(byBlocker).toEqual(unknown);
      expect(byBlocked).toEqual(unknown);
    }));

  it("item de pessoa que passou a estar bloqueada some da lista em qualquer sentido, e volta ao desbloquear", () =>
    inRollback(async (tx) => {
      const [me, ana, bia] = [
        await createPerson(tx),
        await createPerson(tx),
        await createPerson(tx),
      ];
      await record(tx, me.id, { kind: "person", handle: ana.handle });
      await record(tx, me.id, { kind: "person", handle: bia.handle });
      await record(tx, ana.id, { kind: "person", handle: me.handle });

      // Eu bloqueio a Ana: some da minha lista.
      await asUser(tx, me.id, (t) =>
        t.insert(blocks).values({ blockerId: me.id, blockedId: ana.id }),
      );
      expect(await list(tx, me.id)).toEqual([
        { kind: "person", handle: bia.handle, displayName: "Ana Teste" },
      ]);
      // A Ana (bloqueada) também não me vê mais na lista dela.
      expect(await list(tx, ana.id)).toEqual([]);

      // Desbloqueia: voltam os dois.
      await asUser(tx, me.id, (t) =>
        t.delete(blocks).where(eq(blocks.blockerId, me.id)),
      );
      expect(await list(tx, me.id)).toHaveLength(2);
      expect(await list(tx, ana.id)).toHaveLength(1);

      // Bloqueio no outro sentido também esconde.
      await asUser(tx, bia.id, (t) =>
        t.insert(blocks).values({ blockerId: bia.id, blockedId: me.id }),
      );
      expect(await list(tx, me.id)).toEqual([
        { kind: "person", handle: ana.handle, displayName: "Ana Teste" },
      ]);
    }));

  it("a linha de pessoa bloqueada continua e pode ser apagada pelo handle", () =>
    inRollback(async (tx) => {
      const [me, ana] = [await createPerson(tx), await createPerson(tx)];
      await record(tx, me.id, { kind: "person", handle: ana.handle });
      await asUser(tx, ana.id, (t) =>
        t.insert(blocks).values({ blockerId: ana.id, blockedId: me.id }),
      );
      expect(await list(tx, me.id)).toEqual([]);
      expect(
        await tx
          .select()
          .from(recentSearches)
          .where(eq(recentSearches.userId, me.id)),
      ).toHaveLength(1);
      await remove(tx, me.id, { kind: "person", handle: ana.handle });
      expect(
        await tx
          .select()
          .from(recentSearches)
          .where(eq(recentSearches.userId, me.id)),
      ).toHaveLength(0);
    }));

  it("apagar o item da pessoa não apaga o de outra pessoa que a buscou", () =>
    inRollback(async (tx) => {
      const [me, other, ana] = [
        await createPerson(tx),
        await createPerson(tx),
        await createPerson(tx),
      ];
      await record(tx, me.id, { kind: "person", handle: ana.handle });
      await record(tx, other.id, { kind: "person", handle: ana.handle });
      await remove(tx, me.id, { kind: "person", handle: ana.handle });
      expect(await list(tx, me.id)).toEqual([]);
      expect(await list(tx, other.id)).toHaveLength(1);
    }));

  it("apagar a conta da pessoa buscada apaga o item", () =>
    inRollback(async (tx) => {
      const [me, ana] = [await createPerson(tx), await createPerson(tx)];
      await record(tx, me.id, { kind: "person", handle: ana.handle });
      await record(tx, me.id, query("dark"));
      await tx.execute(sql`delete from auth.users where id = ${ana.id}`);
      expect(await list(tx, me.id)).toEqual([{ kind: "query", term: "dark" }]);
    }));
});

describe("recent_searches: formato no banco", () => {
  const insertRaw = (tx: Tx, values: Record<string, unknown>) =>
    tx.transaction((sp) => sp.insert(recentSearches).values(values as never));

  it("recusa linha que não bate com o tipo", async () => {
    await inRollback(async (tx) => {
      const me = await createUser(tx);
      const bad: Record<string, unknown>[] = [
        { kind: "outro", term: "x" },
        { kind: "query" },
        { kind: "query", term: "x", title: "sobrando" },
        { kind: "query", term: " x " },
        { kind: "query", term: "a".repeat(101) },
        { kind: "title", mediaType: "movie", title: "sem id" },
        { kind: "title", mediaType: "game", externalId: "1", title: "x" },
        { kind: "title", mediaType: "tv", externalId: "0603", title: "x" },
        { kind: "title", mediaType: "tv", externalId: "1", title: "" },
        {
          kind: "title",
          mediaType: "tv",
          externalId: "1",
          title: "x",
          posterPath: "javascript:alert(1)",
        },
        {
          kind: "title",
          mediaType: "tv",
          externalId: "1",
          title: "x",
          year: "20",
        },
        { kind: "person" },
        { kind: "person", profileId: me },
      ];
      for (const values of bad) {
        await expect(insertRaw(tx, { userId: me, ...values })).rejects.toEqual(
          pgError(CHECK_VIOLATION),
        );
      }
    });
  });

  it("o índice único recusa repetição inserida direto", () =>
    inRollback(async (tx) => {
      const me = await createUser(tx);
      await insertRaw(tx, { userId: me, kind: "query", term: "Dark" });
      await expect(
        insertRaw(tx, { userId: me, kind: "query", term: "dark" }),
      ).rejects.toEqual(pgError(UNIQUE_VIOLATION));
    }));
});
