import { expect, test, type Page } from "@playwright/test";
import { newPerson, SLOW, type Person } from "./support/profile";

// Comentários de outras pessoas na página do título (Fase 2.1b, #79): o
// comentário de quem tem perfil público aparece para os outros, com spoiler
// escondido até pedir, e o bloco de cada episódio abre sob demanda.
const opened: Person[] = [];
test.afterEach(async () => {
  await Promise.all(opened.splice(0).map((p) => p.context.close()));
});

async function person(browser: Parameters<typeof newPerson>[0]) {
  const p = await newPerson(browser);
  opened.push(p);
  return p;
}

async function openTitle(page: Page, name: RegExp, heading: string) {
  await page.goto("/buscar?q=flomo");
  await page.getByRole("link", { name }).first().click();
  await expect(
    page.getByRole("heading", { level: 1, name: heading }),
  ).toBeVisible();
}

async function comment(scope: ReturnType<Page["locator"]>, text: string) {
  const box = scope.getByRole("textbox", { name: "Seu comentário" });
  await expect(box).toBeEnabled({ timeout: SLOW });
  await box.fill(text);
  await scope.getByRole("button", { name: "Comentar" }).click();
  await expect(scope.getByText(text)).toBeVisible({ timeout: SLOW });
}

test("outra pessoa lê o comentário do título e o spoiler fica escondido", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const ana = await person(browser);
  const bia = await person(browser);
  const title = /Filme de Teste do Flomo/;
  const heading = "Filme de Teste do Flomo";

  await openTitle(ana.page, title, heading);
  const anaSection = ana.page.getByRole("region", { name: "Comentários" });
  const unique = ana.handle;
  await anaSection.getByRole("checkbox").click();
  await comment(anaSection, `Spoiler da ${unique}`);

  await openTitle(bia.page, title, heading);
  const section = bia.page.getByRole("region", { name: "Comentários" });
  await expect(section.getByText(`@${ana.handle}`)).toBeVisible({
    timeout: SLOW,
  });
  await expect(section.getByText(`Spoiler da ${unique}`)).toHaveCount(0);
  await section.getByRole("button", { name: "Mostrar spoiler" }).first().click();
  await expect(section.getByText(`Spoiler da ${unique}`)).toBeVisible();
});

test("comentário de episódio abre sob demanda e a outra pessoa o lê", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const ana = await person(browser);
  const bia = await person(browser);
  const title = /Série de Teste do Flomo/;
  const heading = "Série de Teste do Flomo";
  const open = (p: Person) =>
    p.page.getByRole("button", { name: "Comentários: Episódio 1" });

  await openTitle(ana.page, title, heading);
  await open(ana).click();
  const anaBlock = ana.page.getByRole("listitem").filter({
    hasText: "1. Episódio 1",
  });
  await comment(anaBlock, `Episódio da ${ana.handle}`);

  await openTitle(bia.page, title, heading);
  await open(bia).click();
  await expect(
    bia.page.getByText(`Episódio da ${ana.handle}`),
  ).toBeVisible({ timeout: SLOW });
});
