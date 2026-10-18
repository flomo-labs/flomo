import { describe, expect, it } from "vitest";
import { USER } from "../library/test-fakes";
import {
  createComment,
  deleteComment,
  listMyComments,
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
