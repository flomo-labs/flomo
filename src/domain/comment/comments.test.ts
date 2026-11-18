import { describe, expect, it } from "vitest";
import { USER } from "../library/test-fakes";
import {
  createComment,
  deleteComment,
  listMyComments,
  listTitleComments,
  updateComment,
} from "./comments";
import { createFakeComments } from "./test-fakes";

const OTHER_USER = { id: "22222222-2222-4222-8222-222222222222" };
const MOVIE = "aaaaaaaa-0000-4000-8000-000000000002";
const MISSING = "cccccccc-0000-4000-8000-000000000000";

function setup() {
  return createFakeComments({ titles: { [MOVIE]: "movie" } });
}

describe("createComment", () => {
  it("cria vários comentários do mesmo usuário no mesmo título, sem exigir que tenha assistido", async () => {
    const s = setup();
    const first = await createComment(s.deps, USER, { titleId: MOVIE, body: "  Primeira impressão. " });
    const second = await createComment(s.deps, USER, {
      titleId: MOVIE,
      body: "Revi e mudei de ideia.",
      containsSpoilers: true,
    });
    expect(first).toMatchObject({ ok: true, value: { body: "Primeira impressão.", containsSpoilers: false, moderationStatus: "published" } });
    expect(second).toMatchObject({ ok: true, value: { containsSpoilers: true } });
    const mine = await listMyComments(s.deps, USER, { titleId: MOVIE });
    expect(mine.ok && mine.value.map((c) => c.body)).toEqual([
      "Revi e mudei de ideia.",
      "Primeira impressão.",
    ]);
  });

  it("recusa título inexistente, texto vazio e texto grande demais", async () => {
    const s = setup();
    expect(await createComment(s.deps, USER, { titleId: MISSING, body: "Oi" })).toMatchObject({
      error: { code: "TITLE_NOT_FOUND" },
    });
    expect(await createComment(s.deps, USER, { titleId: MOVIE, body: "  \n" })).toMatchObject({
      error: { code: "INVALID_INPUT", message: "Escreva o comentário." },
    });
    expect(await createComment(s.deps, USER, { titleId: MOVIE, body: "a".repeat(5001) })).toMatchObject({
      error: { code: "INVALID_INPUT", message: expect.stringContaining("5000") },
    });
    expect(s.rows).toEqual([]);
  });

  it("recusa entrada malformada com mensagem em português", async () => {
    const s = setup();
    expect(await createComment(s.deps, USER, { titleId: "x", body: "Oi" })).toMatchObject({
      error: { code: "INVALID_INPUT", message: "Dados inválidos." },
    });
  });
});

describe("updateComment", () => {
  it("edita o texto e o aviso de spoiler", async () => {
    const s = setup();
    const created = await createComment(s.deps, USER, { titleId: MOVIE, body: "Antes." });
    if (!created.ok) throw new Error("falhou");
    const result = await updateComment(s.deps, USER, {
      commentId: created.value.id,
      body: "Depois.",
      containsSpoilers: true,
    });
    expect(result).toMatchObject({ ok: true, value: { body: "Depois.", containsSpoilers: true } });
    if (result.ok) expect(result.value.updatedAt > created.value.updatedAt).toBe(true);
  });

  it("não edita comentário inexistente nem de outra pessoa", async () => {
    const s = setup();
    const created = await createComment(s.deps, USER, { titleId: MOVIE, body: "Meu." });
    if (!created.ok) throw new Error("falhou");
    for (const [user, commentId] of [
      [OTHER_USER, created.value.id],
      [USER, MISSING],
    ] as const) {
      expect(await updateComment(s.deps, user, { commentId, body: "Outro." })).toMatchObject({
        error: { code: "COMMENT_NOT_FOUND" },
      });
    }
    expect(s.rows[0].body).toBe("Meu.");
  });

  it("recusa texto inválido sem mexer no comentário", async () => {
    const s = setup();
    const created = await createComment(s.deps, USER, { titleId: MOVIE, body: "Meu." });
    if (!created.ok) throw new Error("falhou");
    const result = await updateComment(s.deps, USER, { commentId: created.value.id, body: " " });
    expect(result).toMatchObject({ error: { code: "INVALID_INPUT" } });
    expect(s.rows[0].body).toBe("Meu.");
  });
});

describe("deleteComment", () => {
  it("apaga só o próprio comentário e não falha se ele não existe", async () => {
    const s = setup();
    const mine = await createComment(s.deps, USER, { titleId: MOVIE, body: "Meu." });
    const theirs = await createComment(s.deps, OTHER_USER, { titleId: MOVIE, body: "Dele." });
    if (!mine.ok || !theirs.ok) throw new Error("falhou");
    expect((await deleteComment(s.deps, USER, { commentId: mine.value.id })).ok).toBe(true);
    expect((await deleteComment(s.deps, USER, { commentId: mine.value.id })).ok).toBe(true);
    expect((await deleteComment(s.deps, USER, { commentId: theirs.value.id })).ok).toBe(true);
    expect(s.rows.map((r) => r.body)).toEqual(["Dele."]);
  });

  it("recusa entrada malformada", async () => {
    const s = setup();
    expect(await deleteComment(s.deps, USER, { commentId: "x" })).toMatchObject({
      error: { code: "INVALID_INPUT" },
    });
  });
});

describe("listMyComments", () => {
  it("lista só os comentários do usuário", async () => {
    const s = setup();
    await createComment(s.deps, USER, { titleId: MOVIE, body: "Meu." });
    await createComment(s.deps, OTHER_USER, { titleId: MOVIE, body: "Dele." });
    const mine = await listMyComments(s.deps, USER, { titleId: MOVIE });
    expect(mine.ok && mine.value.map((c) => c.body)).toEqual(["Meu."]);
  });

  it("recusa título malformado", async () => {
    const s = setup();
    expect(await listMyComments(s.deps, USER, { titleId: "x" })).toMatchObject({
      error: { code: "INVALID_INPUT" },
    });
  });
});

const SERIES = "aaaaaaaa-0000-4000-8000-000000000001";
const SEASON = "bbbbbbbb-0000-4000-8000-000000000001";
const EPISODE = "bbbbbbbb-0000-4000-8000-000000000002";
const OTHER_SEASON = "bbbbbbbb-0000-4000-8000-000000000003";
const ANA = { id: "33333333-3333-4333-8333-333333333333" };
const BRUNO = { id: "44444444-4444-4444-8444-444444444444" };

function setupSeries(readable?: (viewer: string, author: string) => boolean) {
  return createFakeComments({
    titles: { [SERIES]: "tv", [MOVIE]: "movie" },
    seasons: { [SEASON]: SERIES, [OTHER_SEASON]: MOVIE },
    episodes: { [EPISODE]: SERIES },
    readable,
    authors: {
      [ANA.id]: { id: ANA.id, handle: "ana.silva", displayName: "Ana", avatarUrl: null },
    },
  });
}

describe("comentário de temporada e de episódio", () => {
  it("grava o alvo e recusa alvo de outro título, inexistente ou os dois juntos", async () => {
    const s = setupSeries();
    expect(
      await createComment(s.deps, USER, { titleId: SERIES, seasonId: SEASON, body: "Oi" }),
    ).toMatchObject({ ok: true, value: { seasonId: SEASON, episodeId: null } });
    expect(
      await createComment(s.deps, USER, { titleId: SERIES, episodeId: EPISODE, body: "Oi" }),
    ).toMatchObject({ ok: true, value: { seasonId: null, episodeId: EPISODE } });
    expect(
      await createComment(s.deps, USER, { titleId: SERIES, seasonId: OTHER_SEASON, body: "Oi" }),
    ).toMatchObject({ error: { code: "TARGET_NOT_FOUND" } });
    expect(
      await createComment(s.deps, USER, { titleId: SERIES, episodeId: MISSING, body: "Oi" }),
    ).toMatchObject({ error: { code: "TARGET_NOT_FOUND" } });
    expect(
      await createComment(s.deps, USER, {
        titleId: SERIES,
        seasonId: SEASON,
        episodeId: EPISODE,
        body: "Oi",
      }),
    ).toMatchObject({ error: { code: "INVALID_INPUT" } });
    expect(s.rows).toHaveLength(2);
  });
});

describe("listTitleComments", () => {
  it("lista só os de outras pessoas, no escopo pedido, do mais recente para o mais antigo", async () => {
    const s = setupSeries();
    await createComment(s.deps, ANA, { titleId: SERIES, body: "do título 1" });
    await createComment(s.deps, ANA, { titleId: SERIES, seasonId: SEASON, body: "da temporada" });
    await createComment(s.deps, ANA, { titleId: SERIES, episodeId: EPISODE, body: "do episódio" });
    await createComment(s.deps, BRUNO, { titleId: SERIES, body: "do título 2" });
    await createComment(s.deps, USER, { titleId: SERIES, body: "meu" });

    const bodies = async (input: object) => {
      const r = await listTitleComments(s.deps, USER, input);
      return r.ok ? r.value.items.map((c) => c.body) : r;
    };
    expect(await bodies({ titleId: SERIES })).toEqual(["do título 2", "do título 1"]);
    expect(await bodies({ titleId: SERIES, seasonId: SEASON })).toEqual(["da temporada"]);
    expect(await bodies({ titleId: SERIES, episodeId: EPISODE })).toEqual(["do episódio"]);
  });

  it("traz o autor, ou nulo quando o perfil não é legível", async () => {
    const s = setupSeries();
    await createComment(s.deps, ANA, { titleId: SERIES, body: "a" });
    await createComment(s.deps, BRUNO, { titleId: SERIES, body: "b" });
    const r = await listTitleComments(s.deps, USER, { titleId: SERIES });
    expect(r.ok && r.value.items.map((c) => c.author?.handle ?? null)).toEqual([null, "ana.silva"]);
  });

  it("só aparece o que a leitura permite e o publicado", async () => {
    const s = setupSeries((_viewer, author) => author !== BRUNO.id);
    await createComment(s.deps, ANA, { titleId: SERIES, body: "visível" });
    await createComment(s.deps, BRUNO, { titleId: SERIES, body: "perfil privado" });
    const hidden = await createComment(s.deps, ANA, { titleId: SERIES, body: "oculto" });
    s.rows.find((r) => hidden.ok && r.id === hidden.value.id)!.moderationStatus = "hidden";
    const r = await listTitleComments(s.deps, USER, { titleId: SERIES });
    expect(r.ok && r.value.items.map((c) => c.body)).toEqual(["visível"]);
  });

  it("pagina com cursor sem repetir nem perder comentários", async () => {
    const s = setupSeries();
    for (let i = 1; i <= 5; i++) {
      await createComment(s.deps, ANA, { titleId: SERIES, body: `c${i}` });
    }
    const first = await listTitleComments(s.deps, USER, { titleId: SERIES, limit: 2 });
    expect(first.ok && first.value.items.map((c) => c.body)).toEqual(["c5", "c4"]);
    const next = first.ok && first.value.next;
    expect(next).toBeTruthy();
    const second = await listTitleComments(s.deps, USER, { titleId: SERIES, limit: 2, after: next });
    expect(second.ok && second.value.items.map((c) => c.body)).toEqual(["c3", "c2"]);
    const third = await listTitleComments(s.deps, USER, {
      titleId: SERIES,
      limit: 2,
      after: second.ok ? second.value.next : null,
    });
    expect(third.ok && third.value.items.map((c) => c.body)).toEqual(["c1"]);
    expect(third.ok && third.value.next).toBeNull();
  });

  it("recusa título ou alvo inexistente, alvo de outro título e entrada ruim", async () => {
    const s = setupSeries();
    expect(await listTitleComments(s.deps, USER, { titleId: MISSING })).toMatchObject({
      error: { code: "TITLE_NOT_FOUND" },
    });
    expect(await listTitleComments(s.deps, USER, { titleId: SERIES, seasonId: OTHER_SEASON })).toMatchObject({
      error: { code: "TARGET_NOT_FOUND" },
    });
    expect(await listTitleComments(s.deps, USER, { titleId: SERIES, limit: 1000 })).toMatchObject({
      error: { code: "INVALID_INPUT" },
    });
    expect(
      await listTitleComments(s.deps, USER, {
        titleId: SERIES,
        after: { at: "2026-10-18", id: SEASON },
      }),
    ).toMatchObject({ error: { code: "INVALID_INPUT" } });
  });
});
