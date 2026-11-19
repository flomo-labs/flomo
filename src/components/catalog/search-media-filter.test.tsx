// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SearchMediaFilter } from "./search-media-filter";
import { SearchStateFields } from "./search-state-fields";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const labels = {
  aria: "Tipo de título",
  all: "Tudo",
  series: "Séries",
  movies: "Filmes",
};

afterEach(() => {
  cleanup();
  push.mockReset();
});

describe("SearchMediaFilter", () => {
  it("Séries vai para a URL com o termo, sem página", async () => {
    render(<SearchMediaFilter query="office" media="tudo" labels={labels} />);
    await userEvent.click(screen.getByRole("tab", { name: "Séries" }));
    expect(push).toHaveBeenCalledWith("/buscar?q=office&midia=series");
  });

  it("voltar a Tudo tira o parâmetro", async () => {
    render(<SearchMediaFilter query="office" media="filmes" labels={labels} />);
    await userEvent.click(screen.getByRole("tab", { name: "Tudo" }));
    expect(push).toHaveBeenCalledWith("/buscar?q=office");
  });
});

describe("SearchStateFields", () => {
  it("leva o filtro ou a aba nos formulários, e nada em Tudo", () => {
    const { container, rerender } = render(
      <SearchStateFields media="series" />,
    );
    expect(container.querySelector("input[name=midia]")).toHaveProperty(
      "value",
      "series",
    );
    rerender(<SearchStateFields people media="series" />);
    expect(container.querySelector("input[name=midia]")).toBeNull();
    expect(container.querySelector("input[name=tipo]")).toHaveProperty(
      "value",
      "pessoas",
    );
    rerender(<SearchStateFields />);
    expect(container.querySelector("input")).toBeNull();
  });
});
