// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { CommentsDisclosure } from "./comments-disclosure";

afterEach(cleanup);

describe("CommentsDisclosure", () => {
  it("só monta o bloco depois de aberto e fecha de novo", async () => {
    const user = userEvent.setup();
    render(
      <CommentsDisclosure label="Comentários" ariaLabel="Comentários: Episódio 3">
        <p>Bloco</p>
      </CommentsDisclosure>,
    );
    const button = screen.getByRole("button", {
      name: "Comentários: Episódio 3",
    });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Bloco")).toBeNull();
    await user.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Bloco")).toBeTruthy();
    await user.click(button);
    expect(screen.queryByText("Bloco")).toBeNull();
  });
});
