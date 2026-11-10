import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { signUpAndSignIn } from "./support/auth";

// Seguir no perfil (Fase 2.1, #76): perfil público segue direto; perfil
// privado recebe solicitação, que o dono aceita ou recusa. Duas pessoas, cada
// uma em seu contexto de navegador.
const SLOW = 15_000;

async function chooseHandle(page: Page) {
  const handle = `e2e.${randomUUID().slice(0, 8)}`;
  await page.goto("/cadastro");
  await page.getByLabel("Nome de usuário").fill(handle);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).not.toHaveURL(/\/cadastro/);
  return handle;
}

async function makePrivate(page: Page) {
  await page.goto("/configuracoes");
  await page.getByLabel("Perfil privado").check();
  await page
    .getByRole("button", { name: /^Salvar/ })
    .first()
    .click();
  await expect(page.getByText("Perfil salvo.")).toBeVisible({ timeout: SLOW });
}

test("seguir perfil público, deixar de seguir", async ({ browser }) => {
  const a = await browser.newContext();
  const b = await browser.newContext();
  const pageA = await a.newPage();
  const pageB = await b.newPage();
  await signUpAndSignIn(a);
  await signUpAndSignIn(b);
  const handleA = await chooseHandle(pageA);
  await chooseHandle(pageB);

  await pageB.goto(`/@${handleA}`);
  await pageB.getByRole("button", { name: /^Seguir / }).click();
  const following = pageB.getByRole("button", { name: /^Deixar de seguir / });
  await expect(following).toBeVisible({ timeout: SLOW });
  await expect(following).toHaveText("Seguindo");

  await following.click();
  await expect(pageB.getByRole("button", { name: /^Seguir / })).toBeVisible({
    timeout: SLOW,
  });
  await a.close();
  await b.close();
});

test("perfil privado: solicitar, aceitar e recusar", async ({ browser }) => {
  const owner = await browser.newContext();
  const x = await browser.newContext();
  const y = await browser.newContext();
  const pageOwner = await owner.newPage();
  const pageX = await x.newPage();
  const pageY = await y.newPage();
  await signUpAndSignIn(owner);
  await signUpAndSignIn(x);
  await signUpAndSignIn(y);
  const handleOwner = await chooseHandle(pageOwner);
  await chooseHandle(pageX);
  await chooseHandle(pageY);
  await makePrivate(pageOwner);

  for (const page of [pageX, pageY]) {
    await page.goto(`/@${handleOwner}`);
    await expect(page.getByText(/Este perfil é privado/)).toBeVisible();
    await page.getByRole("button", { name: /^Seguir / }).click();
    await expect(page.getByRole("button", { name: "Solicitado" })).toBeVisible({
      timeout: SLOW,
    });
  }

  await pageOwner.goto(`/@${handleOwner}`);
  await expect(
    pageOwner.getByRole("heading", { name: /Solicitações para seguir \(2\)/ }),
  ).toBeVisible();
  await pageOwner
    .getByRole("button", { name: /^Aceitar / })
    .first()
    .click();
  await expect(
    pageOwner.getByRole("heading", { name: /Solicitações para seguir \(1\)/ }),
  ).toBeVisible({ timeout: SLOW });
  await pageOwner.getByRole("button", { name: /^Recusar / }).click();
  await expect(
    pageOwner.getByRole("heading", { name: /Solicitações para seguir/ }),
  ).toHaveCount(0, { timeout: SLOW });

  await owner.close();
  await x.close();
  await y.close();
});
