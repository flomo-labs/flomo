import { describe, expect, it } from "vitest";
import { shouldRedirectToStart } from "./start-screen-path";

const base = {
  method: "GET",
  pathname: "/",
  fetchMode: "navigate",
  fetchDest: "document",
  signedIn: true,
};

describe("redirecionamento da raiz para quem está logado", () => {
  it("logado e na raiz: vai para o Seguintes", () => {
    expect(shouldRedirectToStart(base)).toBe(true);
  });

  it("sem login, em outra tela, em prefetch ou fora de GET: não redireciona", () => {
    expect(shouldRedirectToStart({ ...base, signedIn: false })).toBe(false);
    expect(shouldRedirectToStart({ ...base, pathname: "/seguintes" })).toBe(
      false,
    );
    expect(shouldRedirectToStart({ ...base, fetchMode: "cors" })).toBe(false);
    expect(shouldRedirectToStart({ ...base, fetchDest: "empty" })).toBe(false);
    expect(shouldRedirectToStart({ ...base, fetchMode: null })).toBe(false);
    expect(shouldRedirectToStart({ ...base, method: "POST" })).toBe(false);
  });
});
