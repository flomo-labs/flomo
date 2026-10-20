import { describe, expect, it } from "vitest";
import {
  DISCOVER_ITEM,
  FOLLOWING_ITEM,
  isNavItemActive,
  LIBRARY_ITEM,
  profileItem,
} from "./nav-items";

describe("isNavItemActive", () => {
  it("marca Seguintes na raiz e em /seguintes", () => {
    for (const path of ["/", "/seguintes"]) {
      expect(isNavItemActive(FOLLOWING_ITEM, path)).toBe(true);
    }
    expect(isNavItemActive(FOLLOWING_ITEM, "/buscar")).toBe(false);
  });

  it("marca Descobrir e Biblioteca pelo começo do caminho", () => {
    expect(isNavItemActive(DISCOVER_ITEM, "/buscar")).toBe(true);
    expect(isNavItemActive(LIBRARY_ITEM, "/biblioteca")).toBe(true);
    expect(isNavItemActive(LIBRARY_ITEM, "/seguintes")).toBe(false);
  });

  it("marca Perfil no perfil do usuário (com @ codificado ou não) e nas configurações", () => {
    const item = profileItem("/@renato");
    expect(isNavItemActive(item, "/@renato")).toBe(true);
    expect(isNavItemActive(item, "/%40renato")).toBe(true);
    expect(isNavItemActive(item, "/perfil/renato")).toBe(true);
    expect(isNavItemActive(item, "/configuracoes")).toBe(true);
    expect(isNavItemActive(item, "/@outra-pessoa")).toBe(false);
    expect(isNavItemActive(item, "/perfil/outra-pessoa")).toBe(false);
    expect(isNavItemActive(item, "/")).toBe(false);
  });
});
