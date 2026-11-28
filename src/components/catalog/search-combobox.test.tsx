// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchCombobox, type SearchPeopleLabels } from "./search-combobox";

const { push, suggestPeople, recentActions } = vi.hoisted(() => ({
  push: vi.fn(),
  suggestPeople: vi.fn(),
  recentActions: {
    listRecents: vi.fn(),
    recordRecent: vi.fn(),
    removeRecent: vi.fn(),
    clearRecents: vi.fn(),
  },
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
vi.mock("@/app/_recent-search/actions", () => recentActions);
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
    expect(
      screen.getAllByRole("button", { name: /^Ver tudo em/ }),
    ).toHaveLength(2);
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
  const mobileScreen = { close: "Fechar a busca" };
  const closeButton = () =>
    screen.queryByRole("button", { name: "Fechar a busca" });

  it("sem mobileScreen não há botão de fechar", async () => {
    render(<SearchCombobox labels={labels} ariaLabel="Buscar" />);
    await userEvent.click(screen.getByRole("combobox"));
    expect(closeButton()).toBeNull();
  });

  it("ao focar mostra o X; ele fecha e apaga a busca", async () => {
    render(
      <SearchCombobox
        labels={labels}
        ariaLabel="Buscar"
        mobileScreen={mobileScreen}
      />,
    );
    expect(closeButton()).toBeNull();
    const field = screen.getByRole("combobox");
    await userEvent.type(field, "ana");
    await userEvent.click(closeButton()!);
    expect(closeButton()).toBeNull();
    expect((field as HTMLInputElement).value).toBe("");
  });

  it("Esc também fecha e apaga", async () => {
    render(
      <SearchCombobox
        labels={labels}
        ariaLabel="Buscar"
        mobileScreen={mobileScreen}
      />,
    );
    const field = screen.getByRole("combobox");
    await userEvent.type(field, "ana");
    await userEvent.keyboard("{Escape}");
    expect(closeButton()).toBeNull();
    expect((field as HTMLInputElement).value).toBe("");
  });

  it("com a tela cheia aberta o gesto de rolar fora da lista é cancelado", async () => {
    render(
      <SearchCombobox
        labels={labels}
        ariaLabel="Buscar"
        mobileScreen={mobileScreen}
      />,
    );
    // Fechada, a página rola normalmente.
    expect(fireEvent.touchMove(document.body)).toBe(true);
    await userEvent.click(screen.getByRole("combobox"));
    expect(fireEvent.touchMove(document.body)).toBe(false);
    await userEvent.click(closeButton()!);
    expect(fireEvent.touchMove(document.body)).toBe(true);
  });
});

describe("SearchCombobox: buscas recentes (#414)", () => {
  const recentLabels = {
    heading: "Buscas recentes",
    clear: "Limpar",
    clearAria: "Limpar as buscas recentes",
    remove: "Remover “{term}” das buscas recentes",
  };
  const KEY = "flomo:buscas-recentes";
  const q = (term: string) => ({ kind: "query", term });
  const stored = () => JSON.parse(sessionStorage.getItem(KEY) ?? "null");
  function renderRecent(props: { signedIn?: boolean } = {}) {
    render(
      <SearchCombobox
        labels={labels}
        ariaLabel="Buscar"
        recentLabels={recentLabels}
        peopleLabels={props.signedIn ? peopleLabels : undefined}
      />,
    );
    return screen.getByRole("combobox");
  }
  beforeEach(() => {
    sessionStorage.clear();
    recentActions.listRecents.mockResolvedValue({
      ok: true,
      value: { items: [] },
    });
    for (const action of [
      recentActions.recordRecent,
      recentActions.removeRecent,
      recentActions.clearRecents,
    ]) {
      action.mockResolvedValue({ ok: true, value: {} });
    }
  });
  afterEach(() => Object.values(recentActions).forEach((a) => a.mockReset()));

  it("campo vazio e em foco lista as recentes, da mais nova para a mais antiga", async () => {
    sessionStorage.setItem(KEY, JSON.stringify([q("dark"), q("the bear")]));
    const field = renderRecent();
    await userEvent.click(field);
    const options = screen.getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["dark", "the bear"]);
    expect(field.getAttribute("aria-expanded")).toBe("true");
  });

  it("não abre sem histórico nem sem recentLabels", async () => {
    const field = renderRecent();
    await userEvent.click(field);
    expect(field.getAttribute("aria-expanded")).toBe("false");
  });

  it("somem ao digitar", async () => {
    sessionStorage.setItem(KEY, JSON.stringify([q("dark")]));
    const field = renderRecent();
    await userEvent.click(field);
    await userEvent.type(field, "x");
    expect(screen.queryByText("Buscas recentes")).toBeNull();
  });

  it("clicar num item preenche o campo, busca e sobe o termo", async () => {
    sessionStorage.setItem(KEY, JSON.stringify([q("dark"), q("the bear")]));
    const field = renderRecent();
    await userEvent.click(field);
    await userEvent.click(screen.getByText("the bear"));
    expect((field as HTMLInputElement).value).toBe("the bear");
    expect(push).toHaveBeenCalledWith(expect.stringContaining("q=the+bear"));
    expect(stored()).toEqual([q("the bear"), q("dark")]);
  });

  it("o × remove só o item, sem buscar", async () => {
    sessionStorage.setItem(KEY, JSON.stringify([q("dark"), q("the bear")]));
    await userEvent.click(renderRecent());
    await userEvent.click(
      screen.getByRole("button", {
        name: "Remover “dark” das buscas recentes",
      }),
    );
    expect(push).not.toHaveBeenCalled();
    expect(stored()).toEqual([q("the bear")]);
  });

  it("Limpar apaga todas", async () => {
    sessionStorage.setItem(KEY, JSON.stringify([q("dark"), q("the bear")]));
    await userEvent.click(renderRecent());
    await userEvent.click(
      screen.getByRole("button", { name: "Limpar as buscas recentes" }),
    );
    expect(stored()).toBeNull();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("logado: a lista vem do servidor e o visitante não chama o servidor", async () => {
    recentActions.listRecents.mockResolvedValue({
      ok: true,
      value: { items: [q("dark"), q("the bear")] },
    });
    const field = renderRecent({ signedIn: true });
    await userEvent.click(field);
    await waitFor(() =>
      expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
        "dark",
        "the bear",
      ]),
    );
    cleanup();
    recentActions.listRecents.mockClear();
    await userEvent.click(renderRecent());
    expect(recentActions.listRecents).not.toHaveBeenCalled();
  });

  it("logado: Enter registra o termo no servidor e não no navegador", async () => {
    const field = renderRecent({ signedIn: true });
    await userEvent.type(field, "Dark{Enter}");
    expect(recentActions.recordRecent).toHaveBeenCalledWith(q("Dark"));
    expect(stored()).toBeNull();
  });

  it("logado: remover um item e Limpar chamam o servidor", async () => {
    recentActions.listRecents.mockResolvedValue({
      ok: true,
      value: { items: [q("dark"), q("the bear")] },
    });
    await userEvent.click(renderRecent({ signedIn: true }));
    await userEvent.click(
      await screen.findByRole("button", {
        name: "Remover “dark” das buscas recentes",
      }),
    );
    expect(recentActions.removeRecent).toHaveBeenCalledWith(q("dark"));
    await userEvent.click(
      screen.getByRole("button", { name: "Limpar as buscas recentes" }),
    );
    expect(recentActions.clearRecents).toHaveBeenCalled();
  });

  it("visitante: Enter guarda o termo e o formulário segue", async () => {
    const field = renderRecent();
    await userEvent.type(field, "severance{Enter}");
    expect(stored()).toEqual([q("severance")]);
  });

  it("usuário aceito vai para o servidor só com o handle", async () => {
    mockPeople([ana]);
    const field = renderRecent({ signedIn: true });
    await userEvent.type(field, "ana");
    await userEvent.click(await screen.findByText("Ana Souza"));
    expect(recentActions.recordRecent).toHaveBeenCalledWith({
      kind: "person",
      handle: "ana",
    });
  });

  it("usuário recente (visitante não vê) abre o perfil", async () => {
    recentActions.listRecents.mockResolvedValue({
      ok: true,
      value: {
        items: [{ kind: "person", handle: "ana", displayName: "Ana Souza" }],
      },
    });
    await userEvent.click(renderRecent({ signedIn: true }));
    expect(await screen.findByText("@ana")).toBeTruthy();
    await userEvent.click(screen.getByText("Ana Souza"));
    expect(push).toHaveBeenCalledWith("/@ana");
  });

  it("título aceito aparece com nome e tipo · ano e abre o título", async () => {
    sessionStorage.setItem(
      KEY,
      JSON.stringify([
        {
          kind: "title",
          mediaType: "tv",
          externalId: "70523",
          title: "Dark",
          year: "2017",
          posterPath: null,
        },
      ]),
    );
    await userEvent.click(renderRecent());
    expect(screen.getByText("Série · 2017")).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Remover “Dark” das buscas recentes",
      }),
    ).toBeTruthy();
    await userEvent.click(screen.getByText("Dark"));
    expect(push).toHaveBeenCalledWith("/titulo/ref/serie/70523");
  });

  it("sessionStorage indisponível não quebra", async () => {
    const spy = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("bloqueado");
      });
    const field = renderRecent();
    await userEvent.click(field);
    expect(field.getAttribute("aria-expanded")).toBe("false");
    spy.mockRestore();
  });
});
