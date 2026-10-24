import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { signUpAndSignIn } from "./support/auth";

// Fluxo do spike (Plano v2, Fase 1): entrar → buscar → abrir título → marcar
// episódio → avaliar 3,5★ → 2 comentários → /em-breve. Catálogo vem do TMDB
// falso (e2e/tmdb-fake/); banco e login, do Supabase local.
// Servidor de ação + revalidação em runner lento passa de 5 s.
const SLOW = 15_000;

test("fluxo do spike, do login ao /em-breve", async ({ page, context }) => {
  await signUpAndSignIn(context);

  // Primeiro acesso: troca o handle provisório pelo definitivo.
  const handle = `e2e.${randomUUID().slice(0, 8)}`;
  await page.goto("/cadastro");
  await page.getByLabel("Nome de usuário").fill(handle);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).not.toHaveURL(/\/cadastro/);

  // Busca e página da série.
  await page.goto("/buscar?q=flomo");
  await page
    .getByRole("link", { name: /Série de Teste do Flomo/ })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Série de Teste do Flomo" }),
  ).toBeVisible();

  // Marca o episódio 1.
  const episode1 = page
    .getByRole("listitem")
    .filter({ hasText: "1. Episódio 1" });
  await episode1.getByRole("button", { name: "Marcar como assistido" }).click();
  await expect(
    episode1.getByRole("button", { name: "Desmarcar" }),
  ).toBeVisible();

  // Filme: marca como assistido, dá 3,5★ e escreve 2 comentários.
  await page.goto("/buscar?q=flomo");
  await page
    .getByRole("link", { name: /Filme de Teste do Flomo/ })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Filme de Teste do Flomo" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Marcar como assistido" }).click();
  await expect(page.getByRole("button", { name: "Desmarcar" })).toBeVisible();

  const rating = page.getByRole("radiogroup", { name: "Sua nota" });
  await rating.getByRole("radio", { name: "3,5 de 5 estrelas" }).click();
  await expect(
    rating.getByRole("radio", { name: "3,5 de 5 estrelas" }),
  ).toBeChecked();

  const comments = page.getByRole("region", { name: "Comentários" });
  for (const text of [
    "Primeiro comentário do E2E.",
    "Segundo comentário do E2E.",
  ]) {
    const box = comments.getByRole("textbox", { name: "Seu comentário" });
    // O formulário só volta a aceitar texto (habilitado e vazio) depois que a
    // ação anterior termina; esperar isso evita o teste depender de tempo.
    await expect(box).toBeEnabled({ timeout: SLOW });
    await expect(box).toHaveValue("");
    await box.fill(text);
    await comments.getByRole("button", { name: "Comentar" }).click();
    await expect(comments.getByText(text)).toBeVisible({ timeout: SLOW });
  }

  // Tudo continua lá depois de recarregar (gravado no banco).
  await page.reload();
  await expect(
    page
      .getByRole("radiogroup", { name: "Sua nota" })
      .getByRole("radio", { name: "3,5 de 5 estrelas" }),
  ).toBeChecked();
  await expect(comments.getByText("Primeiro comentário do E2E.")).toBeVisible({
    timeout: SLOW,
  });
  await expect(comments.getByText("Segundo comentário do E2E.")).toBeVisible({
    timeout: SLOW,
  });

  // Os dois títulos aparecem na biblioteca.
  await page.goto("/biblioteca");
  await expect(page.getByText("Série de Teste do Flomo")).toBeVisible();
  await expect(page.getByText("Filme de Teste do Flomo")).toBeVisible();

  await page.goto("/em-breve");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
