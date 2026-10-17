import { describe, expect, it } from "vitest";
import { shouldRedirectToStart } from "./start-screen-path";

const base = {
  method: "GET",
  pathname: "/",
  fetchMode: "navigate",
  fetchDest: "document",
  hasCookie: false,
  signedIn: true,
};

describe("redirecionamento da primeira entrada", () => {
  it("logado, na Home e sem o cookie da sessão: vai para /inicio", () => {
    expect(shouldRedirectToStart(base)).toBe(true);
  });

  it("com o cookie, a Home é a Home (o logo sempre chega nela)", () => {
    expect(shouldRedirectToStart({ ...base, hasCookie: true })).toBe(false);
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
