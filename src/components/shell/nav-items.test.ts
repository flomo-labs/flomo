import { describe, expect, it } from "vitest";
import {
  DISCOVER_ITEM,
  HOME_ITEM,
  isNavItemActive,
  LIBRARY_ITEM,
  profileItem,
} from "./nav-items";

describe("isNavItemActive", () => {
  it("marca Seguintes na Home, em Seguintes e em /inicio", () => {
    for (const path of ["/", "/seguintes", "/inicio"]) {
      expect(isNavItemActive(HOME_ITEM, path)).toBe(true);
    }
    expect(isNavItemActive(HOME_ITEM, "/buscar")).toBe(false);
  });

  it("marca Descobrir e Biblioteca pelo começo do caminho", () => {
    expect(isNavItemActive(DISCOVER_ITEM, "/buscar")).toBe(true);
    expect(isNavItemActive(LIBRARY_ITEM, "/biblioteca")).toBe(true);
    expect(isNavItemActive(LIBRARY_ITEM, "/seguintes")).toBe(false);
  });

  it("marca Perfil no perfil de alguém e nas configurações", () => {
    const item = profileItem("/@renato");
    expect(isNavItemActive(item, "/perfil/renato")).toBe(true);
    expect(isNavItemActive(item, "/configuracoes")).toBe(true);
    expect(isNavItemActive(item, "/")).toBe(false);
  });
});
