import { describe, expect, it } from "vitest";
import { normalizeHandle } from "@/contracts/profile";
import { changeHandle } from "./change-handle";
import type { ProfileRepository } from "./ports";

const OWNER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

// Repositório em memória com a mesma regra de unicidade do banco.
function fakeProfiles(initial: Record<string, string>) {
  const handles = new Map(Object.entries(initial));
  const repo: ProfileRepository = {
    async isHandleTaken(normalized, exceptUserId) {
      return [...handles].some(
        ([id, h]) => id !== exceptUserId && normalizeHandle(h) === normalized,
      );
    },
    async updateHandle(userId, handle) {
      if (!handles.has(userId)) return "not_found";
      const taken = [...handles].some(
        ([id, h]) =>
          id !== userId && normalizeHandle(h) === normalizeHandle(handle),
      );
      if (taken) return "taken";
      handles.set(userId, handle);
      return "updated";
    },
    findByHandle: async () => null,
    getStats: async () => null,
    updateDetails: async () => "not_found",
  };
  return { repo, handles };
}

describe("changeHandle", () => {
  it("troca o handle provisório pelo definitivo, normalizado", async () => {
    const { repo, handles } = fakeProfiles({ [OWNER]: "u_111111111111" });

    const result = await changeHandle(
      { profiles: repo },
      { id: OWNER },
      { handle: " Renato.Silva " },
    );

    expect(result).toEqual({ ok: true, value: { handle: "renato.silva" } });
    expect(handles.get(OWNER)).toBe("renato.silva");
  });

  it("devolve INVALID_INPUT com a mensagem do schema", async () => {
    const { repo, handles } = fakeProfiles({ [OWNER]: "u_111111111111" });

    const result = await changeHandle(
      { profiles: repo },
      { id: OWNER },
      { handle: "admin" },
    );

    expect(result).toEqual({
      ok: false,
      error: {
        code: "INVALID_INPUT",
        message: "Este nome de usuário é reservado.",
      },
    });
    expect(handles.get(OWNER)).toBe("u_111111111111");
  });

  it("rejeita entrada sem handle", async () => {
    const { repo } = fakeProfiles({ [OWNER]: "u_111111111111" });
    const result = await changeHandle({ profiles: repo }, { id: OWNER }, {});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INVALID_INPUT");
  });

  it("recusa handle de outra pessoa, mesmo com outros separadores", async () => {
    const { repo, handles } = fakeProfiles({
      [OWNER]: "u_111111111111",
      [OTHER]: "renato.silva",
    });

    for (const handle of ["renato.silva", "renato_silva", "renatosilva"]) {
      const result = await changeHandle(
        { profiles: repo },
        { id: OWNER },
        { handle },
      );
      expect(result).toEqual({
        ok: false,
        error: {
          code: "HANDLE_TAKEN",
          message: "Este nome de usuário já está em uso.",
        },
      });
    }
    expect(handles.get(OWNER)).toBe("u_111111111111");
  });

  it("permite trocar entre variações do próprio handle", async () => {
    const { repo, handles } = fakeProfiles({ [OWNER]: "renato.silva" });

    const result = await changeHandle(
      { profiles: repo },
      { id: OWNER },
      { handle: "renato_silva" },
    );

    expect(result.ok).toBe(true);
    expect(handles.get(OWNER)).toBe("renato_silva");
  });

  it("trata a corrida perdida no banco como HANDLE_TAKEN", async () => {
    const { repo } = fakeProfiles({ [OWNER]: "u_111111111111" });
    repo.isHandleTaken = async () => false;
    repo.updateHandle = async () => "taken";

    const result = await changeHandle(
      { profiles: repo },
      { id: OWNER },
      { handle: "renato" },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("HANDLE_TAKEN");
  });

  it("devolve PROFILE_NOT_FOUND se o perfil não existe", async () => {
    const { repo } = fakeProfiles({});

    const result = await changeHandle(
      { profiles: repo },
      { id: OWNER },
      { handle: "renato" },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PROFILE_NOT_FOUND");
  });
});
