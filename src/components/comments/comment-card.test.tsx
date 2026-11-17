// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import {
  CommentCard,
  type CommentCardData,
  type CommentCardLabels,
} from "./comment-card";

const labels: CommentCardLabels = {
  anonymousAuthor: "Pessoa do Flomo",
  spoilers: "Spoiler",
  spoilerHidden: "Este comentário tem spoiler.",
  showSpoiler: "Mostrar spoiler",
  hideSpoiler: "Esconder spoiler",
  edited: "editado",
};

const base: CommentCardData = {
  id: "c1",
  body: "Que final!",
  containsSpoilers: false,
  edited: false,
  date: "17 de nov. de 2026",
  author: { handle: "maria", displayName: "Maria Souza" },
};

afterEach(cleanup);

describe("CommentCard", () => {
  it("mostra autor com link para o perfil, data e texto", () => {
    render(<CommentCard comment={base} labels={labels} />);
    expect(screen.getByRole("link", { name: /Maria Souza/ })).toHaveProperty(
      "href",
      expect.stringContaining("/@maria"),
    );
    expect(screen.getByText("Que final!")).toBeTruthy();
    expect(screen.getByText("17 de nov. de 2026")).toBeTruthy();
    expect(screen.queryByText("editado")).toBeNull();
  });

  it("usa o @handle sem nome de exibição e avisa quando foi editado", () => {
    render(
      <CommentCard
        comment={{
          ...base,
          edited: true,
          author: { handle: "joao", displayName: null },
        }}
        labels={labels}
      />,
    );
    expect(screen.getByText("@joao")).toBeTruthy();
    expect(screen.getByText("editado")).toBeTruthy();
  });

  it("autor sem perfil legível aparece como rótulo neutro, sem link", () => {
    render(<CommentCard comment={{ ...base, author: null }} labels={labels} />);
    expect(screen.getByText("Pessoa do Flomo")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("esconde o texto com spoiler até a pessoa pedir", async () => {
    const user = userEvent.setup();
    render(
      <CommentCard
        comment={{ ...base, containsSpoilers: true, body: "Ele morre" }}
        labels={labels}
      />,
    );
    expect(screen.queryByText("Ele morre")).toBeNull();
    expect(screen.getByText("Este comentário tem spoiler.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Mostrar spoiler" }));
    expect(screen.getByText("Ele morre")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Esconder spoiler" }));
    expect(screen.queryByText("Ele morre")).toBeNull();
  });
});
