import { expect, test } from "@playwright/test";

// Landing com dois caminhos, abas de /entrar por situação e confirmação de
// senha (#251). Não cria conta: o envio com senhas diferentes é barrado antes
// de chamar o servidor.

test("landing: Criar conta abre /entrar na aba de criar conta", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/entrar\?modo=criar/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Criar sua conta" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Criar conta com o Google" }),
  ).toBeVisible();
});

test("landing: Já tenho conta abre /entrar na aba de entrar", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Já tenho conta · Entrar" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Entrar na sua conta" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Entrar com o Google" }),
  ).toBeVisible();
  await expect(page.getByLabel("Confirmar senha")).toHaveCount(0);
});

test("criar conta com senhas diferentes mostra o erro e não envia", async ({
  page,
}) => {
  await page.goto("/entrar?modo=criar");
  await page.getByLabel("E-mail").fill("pessoa@example.com");
  await page.getByLabel("Senha", { exact: true }).fill("senha-segura-1");
  await page.getByLabel("Confirmar senha").fill("senha-segura-2");
  await page
    .getByRole("button", { name: "Criar conta", exact: true })
    .first()
    .click();
  await expect(page.locator("p[role=alert]")).toHaveText(
    "As senhas não são iguais.",
  );
  await expect(
    page.getByRole("heading", { name: "Confira seu e-mail" }),
  ).toHaveCount(0);
  // Os campos continuam preenchidos para corrigir.
  await expect(page.getByLabel("Senha", { exact: true })).toHaveValue(
    "senha-segura-1",
  );
});

test("o atalho troca entre entrar e criar conta", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Criar sua conta" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Entrar na sua conta" }),
  ).toBeVisible();
});

for (const [width, height] of [
  [320, 568],
  [375, 667],
  [430, 932],
]) {
  test(`landing não ocupa mais que a tela em ${width}x${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    const content = await page.locator("[data-landing]").evaluate((el) => ({
      main: el.querySelector("main")!.getBoundingClientRect().bottom,
      consent: el.querySelector(":scope > p")!.getBoundingClientRect().top,
      scrollHeight: document.documentElement.scrollHeight,
    }));
    expect(content.scrollHeight).toBeLessThanOrEqual(height);
    // O texto de apoio e os botões cabem acima do aviso de idade e termos.
    expect(content.main).toBeLessThanOrEqual(content.consent);
  });
}
