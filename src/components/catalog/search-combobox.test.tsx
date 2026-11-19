// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchCombobox, type SearchPeopleLabels } from "./search-combobox";

const { push, suggestPeople } = vi.hoisted(() => ({
  push: vi.fn(),
  suggestPeople: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/buscar",
  useSearchParams: () => new URLSearchParams("q=x&midia=series"),
}));
vi.mock("@/app/_library/actions", () => ({
  refsInLibrary: vi.fn(async () => ({ ok: true, value: [] })),
}));
vi.mock("@/app/_people/actions", () => ({ suggestPeople }));

const labels = {
  placeholder: "Filme ou série",
  clear: "Apagar a busca",
  suggestions: "Sugestões de títulos",
  seeAll: "Ver todos os resultados para “{query}”",
  movie: "Filme",
  tv: "Série",
  quickAdd: {} as never,
};
const peopleLabels: SearchPeopleLabels = {
  kindLabel: "O que buscar",
  kindTitles: "Séries e filmes",
  kindPeople: "Usuários",
  suggestions: "Sugestões de usuários",
  seeAll: "Ver todos os usuários para “{query}”",
  tooShort: "Digite pelo menos 3 letras.",
  emptyPeople: "Nenhum usuário encontrado para “{query}”.",
  emptyTitles: "Nenhum título encontrado para “{query}”.",
  failed: "Não foi possível buscar agora.",
};

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ items: [] })),
  );
});
afterEach(() => {
  cleanup();
  push.mockReset();
  suggestPeople.mockReset();
  vi.unstubAllGlobals();
});

describe("SearchCombobox: filtro Séries e filmes / Usuários", () => {
  it("visitante não vê o filtro", async () => {
    render(<SearchCombobox labels={labels} ariaLabel="Buscar" />);
    await userEvent.type(screen.getByRole("combobox"), "ana");
    expect(screen.queryByRole("tab", { name: "Usuários" })).toBeNull();
  });

  it("quem entrou vê o filtro e Usuários lista até 5 contas", async () => {
    suggestPeople.mockResolvedValue({
      ok: true,
      value: {
        tooShort: false,
        items: [{ handle: "ana", displayName: "Ana Souza" }],
      },
    });
    render(
      <SearchCombobox
        labels={labels}
        peopleLabels={peopleLabels}
        ariaLabel="Buscar"
      />,
    );
    await userEvent.type(screen.getByRole("combobox"), "ana");
    await userEvent.click(await screen.findByRole("tab", { name: "Usuários" }));
    const option = await screen.findByRole("option", { name: /Ana Souza/ });
    expect(suggestPeople).toHaveBeenCalledWith({ query: "ana" });
    await userEvent.click(option);
    expect(push).toHaveBeenCalledWith("/@ana");
  });

  it("Usuários com menos de 3 letras pede mais letras e não consulta", async () => {
    render(
      <SearchCombobox
        labels={labels}
        peopleLabels={peopleLabels}
        ariaLabel="Buscar"
      />,
    );
    await userEvent.type(screen.getByRole("combobox"), "an");
    await userEvent.click(await screen.findByRole("tab", { name: "Usuários" }));
    expect(await screen.findByText("Digite pelo menos 3 letras.")).toBeTruthy();
    expect(suggestPeople).not.toHaveBeenCalled();
  });

  it("Enter em Usuários abre /buscar na aba Usuários", async () => {
    suggestPeople.mockResolvedValue({
      ok: true,
      value: { tooShort: false, items: [] },
    });
    render(
      <SearchCombobox
        labels={labels}
        peopleLabels={peopleLabels}
        ariaLabel="Buscar"
      />,
    );
    await userEvent.type(screen.getByRole("combobox"), "ana");
    await userEvent.click(await screen.findByRole("tab", { name: "Usuários" }));
    await waitFor(() => expect(suggestPeople).toHaveBeenCalled());
    await userEvent.type(screen.getByRole("combobox"), "{Enter}");
    expect(push).toHaveBeenCalledWith("/buscar?q=ana&tipo=pessoas");
  });

  it("Enter em Séries e filmes abre a Buscar em Tudo, mesmo vindo de Séries", async () => {
    render(
      <SearchCombobox
        labels={labels}
        peopleLabels={peopleLabels}
        ariaLabel="Buscar"
      />,
    );
    await userEvent.type(screen.getByRole("combobox"), "lost{Enter}");
    expect(push).toHaveBeenCalledWith("/buscar?q=lost");
  });

  it("Esc fecha o menu", async () => {
    render(
      <SearchCombobox
        labels={labels}
        peopleLabels={peopleLabels}
        ariaLabel="Buscar"
      />,
    );
    const field = screen.getByRole("combobox");
    await userEvent.type(field, "ana");
    expect(field.getAttribute("aria-expanded")).toBe("true");
    await userEvent.keyboard("{Escape}");
    expect(field.getAttribute("aria-expanded")).toBe("false");
  });
});
