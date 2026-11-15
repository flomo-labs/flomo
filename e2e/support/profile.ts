import { randomUUID } from "node:crypto";
import {
  expect,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { signUpAndSignIn } from "./auth";

// Espera por ações de servidor (seguir, bloquear, salvar) que passam do
// tempo padrão de uma asserção.
export const SLOW = 15_000;

// Escolhe o @handle do usuário recém-criado (tela de cadastro) e o devolve.
export async function chooseHandle(page: Page) {
  const handle = `e2e.${randomUUID().slice(0, 8)}`;
  await page.goto("/cadastro");
  await page.getByLabel("Nome de usuário").fill(handle);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).not.toHaveURL(/\/cadastro/);
  return handle;
}

// Liga ou desliga "Perfil privado" nas configurações e salva.
export async function setPrivate(page: Page, isPrivate: boolean) {
  await page.goto("/configuracoes");
  const box = page.getByRole("checkbox", { name: "Perfil privado" });
  if ((await box.isChecked()) !== isPrivate) await box.click();
  await page
    .getByRole("button", { name: /^Salvar/ })
    .first()
    .click();
  await expect(page.getByText("Perfil salvo.")).toBeVisible({ timeout: SLOW });
}

export type Person = {
  context: BrowserContext;
  page: Page;
  handle: string;
  userId: string;
};

// Pessoa nova e logada, com @handle escolhido, em seu próprio contexto de
// navegador (cada uma tem a sua sessão). Quem chama fecha o contexto.
export async function newPerson(browser: Browser): Promise<Person> {
  const context = await browser.newContext();
  const { userId } = await signUpAndSignIn(context);
  const page = await context.newPage();
  const handle = await chooseHandle(page);
  return { context, page, handle, userId };
}
