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
vi.mock("@/components/catalog/quick-add-button", () => ({
  QuickAddButton: () => null,
}));

const labels = {
  placeholder: "Filme ou série",
  clear: "Apagar a busca",
  suggestions: "Sugestões de títulos",
  titlesHeading: "Séries e filmes",
  seeAllShort: "Ver tudo",
  seeAll: "Ver tudo em Séries e filmes para “{query}”",
  movie: "Filme",
  tv: "Série",
  quickAdd: {} as never,
};
const peopleLabels: SearchPeopleLabels = {
  heading: "Usuários",
  suggestions: "Sugestões de usuários",
  seeAll: "Ver tudo em Usuários para “{query}”",
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

const ana = { handle: "ana", displayName: "Ana Souza" };
function mockPeople(items: { handle: string; displayName: string | null }[]) {
  suggestPeople.mockResolvedValue({
    ok: true,
    value: { tooShort: false, items },
  });
}
function renderSignedIn() {
  render(
    <SearchCombobox
      labels={labels}
      peopleLabels={peopleLabels}
      ariaLabel="Buscar"
    />,
  );
}

describe("SearchCombobox: seções Séries e filmes e Usuários", () => {
  it("visitante vê só Séries e filmes, sem Usuários", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          items: [
            {
              mediaType: "tv",
              externalId: 1,
              title: "Ana TV",
              year: 2020,
              posterPath: null,
            },
          ],
        }),
      ),
    );
    render(<SearchCombobox labels={labels} ariaLabel="Buscar" />);
    await userEvent.type(screen.getByRole("combobox"), "ana");
    await screen.findByRole("option", { name: /Ana TV/ });
    expect(screen.queryByText("Usuários")).toBeNull();
    expect(suggestPeople).not.toHaveBeenCalled();
  });

  it("quem entrou vê as duas seções ao mesmo tempo, cada uma com Ver tudo", async () => {
    mockPeople([ana]);
    renderSignedIn();
    await userEvent.type(screen.getByRole("combobox"), "ana");
    expect(
      await screen.findByRole("option", { name: /Ana Souza/ }),
    ).toBeTruthy();
    expect(screen.getByText("Séries e filmes")).toBeTruthy();
    expect(screen.getByText("Usuários")).toBeTruthy();
    expect(suggestPeople).toHaveBeenCalledWith({ query: "ana" });
    expect(screen.getAllByRole("button", { name: /^Ver tudo em/ })).toHaveLength(
      2,
    );
  });

  it("escolher um usuário abre o perfil", async () => {
    mockPeople([ana]);
    renderSignedIn();
    await userEvent.type(screen.getByRole("combobox"), "ana");
    await userEvent.click(await screen.findByRole("option", { name: /Ana/ }));
    expect(push).toHaveBeenCalledWith("/@ana");
  });

  it("menos de 3 letras avisa em Usuários, sem consultar nem Ver tudo", async () => {
    renderSignedIn();
    await userEvent.type(screen.getByRole("combobox"), "an");
    expect(await screen.findByText("Digite pelo menos 3 letras.")).toBeTruthy();
    expect(suggestPeople).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: /Ver tudo em Usuários/ }),
    ).toBeNull();
  });

  it("Ver tudo de Usuários abre /buscar na aba Usuários", async () => {
    mockPeople([]);
    renderSignedIn();
    await userEvent.type(screen.getByRole("combobox"), "ana");
    await waitFor(() => expect(suggestPeople).toHaveBeenCalled());
    await userEvent.click(
      screen.getByRole("button", { name: /Ver tudo em Usuários/ }),
    );
    expect(push).toHaveBeenCalledWith("/buscar?q=ana&tipo=pessoas");
  });

  it("Ver tudo de Séries e filmes abre a Buscar em Tudo, mesmo vindo de Séries", async () => {
    mockPeople([]);
    renderSignedIn();
    await userEvent.type(screen.getByRole("combobox"), "lost");
    await userEvent.click(
      screen.getByRole("button", { name: /Ver tudo em Séries e filmes/ }),
    );
    expect(push).toHaveBeenCalledWith("/buscar?q=lost");
  });

  it("Enter sem escolher abre a Buscar em Séries e filmes", async () => {
    renderSignedIn();
    await userEvent.type(screen.getByRole("combobox"), "lost{Enter}");
    expect(push).toHaveBeenCalledWith("/buscar?q=lost");
  });

  it("setas percorrem títulos e usuários e Enter abre o escolhido", async () => {
    mockPeople([ana]);
    renderSignedIn();
    await userEvent.type(screen.getByRole("combobox"), "ana");
    await screen.findByRole("option", { name: /Ana Souza/ });
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(push).toHaveBeenCalledWith("/@ana");
  });

  it("Esc fecha o menu", async () => {
    renderSignedIn();
    const field = screen.getByRole("combobox");
    await userEvent.type(field, "ana");
    expect(field.getAttribute("aria-expanded")).toBe("true");
    await userEvent.keyboard("{Escape}");
    expect(field.getAttribute("aria-expanded")).toBe("false");
  });
});

describe("SearchCombobox: tela cheia no celular (#413)", () => {
  const mobileScreen = { back: "Voltar", cancel: "Cancelar" };

  it("sem mobileScreen não há voltar nem Cancelar", async () => {
    render(<SearchCombobox labels={labels} ariaLabel="Buscar" />);
    await userEvent.click(screen.getByRole("combobox"));
    expect(screen.queryByRole("button", { name: "Cancelar" })).toBeNull();
  });

  it("ao focar mostra voltar e Cancelar; Cancelar fecha mantendo o texto", async () => {
    render(
      <SearchCombobox
        labels={labels}
        ariaLabel="Buscar"
        mobileScreen={mobileScreen}
      />,
    );
    expect(screen.queryByRole("button", { name: "Cancelar" })).toBeNull();
    const field = screen.getByRole("combobox");
    await userEvent.type(field, "ana");
    expect(screen.getByRole("button", { name: "Voltar" })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("button", { name: "Cancelar" })).toBeNull();
    expect((field as HTMLInputElement).value).toBe("ana");
  });

  it("Esc e voltar também fecham", async () => {
    render(
      <SearchCombobox
        labels={labels}
        ariaLabel="Buscar"
        mobileScreen={mobileScreen}
      />,
    );
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("button", { name: "Cancelar" })).toBeNull();
    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(screen.queryByRole("button", { name: "Cancelar" })).toBeNull();
  });
});
