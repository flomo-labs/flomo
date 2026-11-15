import { expect, test, type Page } from "@playwright/test";
import { ensureFollowLimits } from "./support/follow-limits";
import {
  countLinksOf,
  seedFollowers,
  seedPeople,
  withFollowLimit,
} from "./support/follow-seed";
import { newPerson, setPrivate, SLOW, type Person } from "./support/profile";

// Seguidores além do básico de seguir (e2e/seguir.spec.ts, #76): listas e
// contagens com paginação, bloqueio, cancelar solicitação, limite de pedidos,
// aceite automático ao virar público e exclusão de conta (Fase 2.1, #355).
// Cada pessoa tem o próprio contexto de navegador; quem precisa de muita gente
// (paginação, limite) a cria direto no banco local (support/follow-seed.ts).
test.beforeAll(ensureFollowLimits);

const opened: Person[] = [];
test.afterEach(async () => {
  await Promise.all(opened.splice(0).map((p) => p.context.close()));
});

async function person(browser: Parameters<typeof newPerson>[0]) {
  const p = await newPerson(browser);
  opened.push(p);
  return p;
}

const counts = (page: Page) =>
  page.getByRole("list", { name: "Seguidores e seguindo" });

async function follow(page: Page, handle: string) {
  await page.goto(`/@${handle}`);
  await page.getByRole("button", { name: /^Seguir / }).click();
}

test("listas e contagens de seguidores e seguindo, com paginação", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const owner = await person(browser);
  // 31 seguidores (a página tem 30) e 1 seguindo.
  const seeded = await seedPeople(31);
  await seedFollowers(
    owner.userId,
    seeded.map((p) => p.id),
  );
  await seedFollowers(seeded[0].id, [owner.userId]);

  await owner.page.goto(`/@${owner.handle}`);
  await expect(counts(owner.page)).toContainText("31 seguidores");
  await expect(counts(owner.page)).toContainText("1 seguindo");

  await counts(owner.page)
    .getByRole("link", { name: /seguidores/ })
    .click();
  await expect(owner.page).toHaveURL(`/@${owner.handle}/seguidores`);
  const menus = owner.page.getByRole("button", { name: /^Mais opções para / });
  // Primeiro trecho: 30, do vínculo mais recente ao mais antigo.
  await expect(menus).toHaveCount(30);
  await expect(owner.page.getByText(seeded[30].name, { exact: true })).toBeVisible();
  await expect(owner.page.getByText(seeded[0].name, { exact: true })).toHaveCount(0);
  // Rolar até o fim pede o trecho seguinte.
  await owner.page.evaluate(() =>
    window.scrollTo(0, document.body.scrollHeight),
  );
  await expect(menus).toHaveCount(31, { timeout: SLOW });
  await expect(owner.page.getByText(seeded[0].name, { exact: true })).toBeVisible();

  // Remover seguidor (menu da linha + confirmação) tira da lista e da contagem.
  await menus.first().click();
  await owner.page.getByRole("menuitem", { name: "Remover seguidor" }).click();
  await owner.page
    .getByRole("dialog")
    .getByRole("button", { name: "Remover seguidor" })
    .click();
  await expect(menus).toHaveCount(30, { timeout: SLOW });
  await expect(owner.page.getByText(seeded[30].name, { exact: true })).toHaveCount(0);
  await owner.page.goto(`/@${owner.handle}`);
  await expect(counts(owner.page)).toContainText("30 seguidores");

  // Lista de quem o dono segue, e deixar de seguir pelo menu da linha.
  await counts(owner.page)
    .getByRole("link", { name: /seguindo/ })
    .click();
  await expect(owner.page).toHaveURL(`/@${owner.handle}/seguindo`);
  await expect(owner.page.getByText(seeded[0].name, { exact: true })).toBeVisible();
  await owner.page.getByRole("button", { name: /^Mais opções para / }).click();
  await owner.page
    .getByRole("menuitem", { name: /^Deixar de seguir / })
    .click();
  await expect(
    owner.page.getByText(`Você deixou de seguir ${seeded[0].name}.`),
  ).toBeVisible({ timeout: SLOW });
  await owner.page.goto(`/@${owner.handle}`);
  await expect(counts(owner.page)).toContainText("0 seguindo");
});

test("bloquear e desbloquear: vínculo desfeito e perfil escondido do bloqueado", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const a = await person(browser);
  const b = await person(browser);
  await follow(b.page, a.handle);
  await expect(
    b.page.getByRole("button", { name: /^Deixar de seguir / }),
  ).toBeVisible({ timeout: SLOW });

  // A bloqueia B (com confirmação): o vínculo some e o Seguir também.
  await a.page.goto(`/@${b.handle}`);
  await a.page.getByRole("button", { name: /^Bloquear / }).click();
  await a.page
    .getByRole("dialog")
    .getByRole("button", { name: "Bloquear", exact: true })
    .click();
  await expect(
    a.page.getByRole("button", { name: /^Desbloquear / }),
  ).toBeVisible({ timeout: SLOW });
  await expect(a.page.getByRole("button", { name: /^Seguir / })).toHaveCount(0);
  await a.page.goto(`/@${a.handle}`);
  await expect(counts(a.page)).toContainText("0 seguidores");

  // Para B, o perfil de A passa a não existir; o vínculo dele foi desfeito.
  await b.page.goto(`/@${a.handle}`);
  await expect(
    b.page.getByRole("heading", { name: "Perfil não encontrado" }),
  ).toBeVisible();
  await b.page.goto(`/@${b.handle}`);
  await expect(counts(b.page)).toContainText("0 seguindo");

  // Desbloquear não restaura o vínculo: B volta a ver A, mas precisa seguir de novo.
  await a.page.goto(`/@${b.handle}`);
  await a.page.getByRole("button", { name: /^Desbloquear / }).click();
  await expect(a.page.getByRole("button", { name: /^Seguir / })).toBeVisible({
    timeout: SLOW,
  });
  await b.page.goto(`/@${a.handle}`);
  await expect(b.page.getByRole("button", { name: /^Seguir / })).toBeVisible();
  await expect(
    b.page.getByRole("button", { name: /^Deixar de seguir / }),
  ).toHaveCount(0);
});

test("cancelar solicitação pendente tira o pedido e o indicador do dono", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const owner = await person(browser);
  const x = await person(browser);
  await setPrivate(owner.page, true);

  await follow(x.page, owner.handle);
  await expect(
    x.page.getByRole("button", { name: /^Cancelar solicitação / }),
  ).toBeVisible({ timeout: SLOW });

  // O dono vê o pedido e o indicador no menu da conta (#353).
  await owner.page.goto(`/@${owner.handle}`);
  await expect(
    owner.page.getByRole("heading", { name: /Solicitações para seguir \(1\)/ }),
  ).toBeVisible();
  await expect(
    owner.page.getByRole("button", {
      name: /1 solicitação para seguir pendente/,
    }),
  ).toBeVisible();

  await x.page.getByRole("button", { name: /^Cancelar solicitação / }).click();
  await expect(x.page.getByRole("button", { name: /^Seguir / })).toBeVisible({
    timeout: SLOW,
  });

  await owner.page.reload();
  await expect(
    owner.page.getByRole("heading", { name: /Solicitações para seguir/ }),
  ).toHaveCount(0);
  await expect(
    owner.page.getByRole("button", { name: "Menu da conta", exact: true }),
  ).toBeVisible();
});

test("limite de pedidos de seguir mostra a mensagem e não cria o vínculo", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const b = await person(browser);
  const targets = await seedPeople(3);

  await withFollowLimit(2, async () => {
    for (const target of targets.slice(0, 2)) {
      await follow(b.page, target.handle);
      await expect(
        b.page.getByRole("button", { name: /^Deixar de seguir / }),
      ).toBeVisible({ timeout: SLOW });
    }
    await follow(b.page, targets[2].handle);
    await expect(
      b.page.getByText(/Você fez muitos pedidos para seguir em pouco tempo/),
    ).toBeVisible({ timeout: SLOW });
    await expect(b.page.getByRole("button", { name: /^Seguir / })).toBeVisible();
  });
});

test("perfil privado que vira público aceita as solicitações pendentes", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const owner = await person(browser);
  const x = await person(browser);
  const y = await person(browser);
  await setPrivate(owner.page, true);
  for (const p of [x, y]) {
    await follow(p.page, owner.handle);
    await expect(
      p.page.getByRole("button", { name: /^Cancelar solicitação / }),
    ).toBeVisible({ timeout: SLOW });
  }

  await setPrivate(owner.page, false);

  await owner.page.goto(`/@${owner.handle}`);
  await expect(counts(owner.page)).toContainText("2 seguidores");
  await expect(
    owner.page.getByRole("heading", { name: /Solicitações para seguir/ }),
  ).toHaveCount(0);
  await x.page.goto(`/@${owner.handle}`);
  await expect(
    x.page.getByRole("button", { name: /^Deixar de seguir / }),
  ).toHaveText("Seguindo");
});

test("excluir a conta apaga os vínculos de seguir", async ({ browser }) => {
  test.setTimeout(120_000);
  const a = await person(browser);
  const b = await person(browser);
  await follow(b.page, a.handle);
  await expect(
    b.page.getByRole("button", { name: /^Deixar de seguir / }),
  ).toBeVisible({ timeout: SLOW });
  await follow(a.page, b.handle);
  await expect(
    a.page.getByRole("button", { name: /^Deixar de seguir / }),
  ).toBeVisible({ timeout: SLOW });
  expect((await countLinksOf(a.userId)).follows).toBe(2);

  await a.page.goto("/configuracoes/conta");
  await a.page.getByRole("button", { name: "Excluir conta" }).click();
  await a.page.getByLabel(/Para confirmar, digite/).fill(a.handle);
  await a.page
    .getByRole("button", { name: "Excluir conta definitivamente" })
    .click();
  await expect(a.page).toHaveURL("/", { timeout: SLOW });

  expect(await countLinksOf(a.userId)).toEqual({ follows: 0, profiles: 0 });
  await b.page.goto(`/@${a.handle}`);
  await expect(
    b.page.getByRole("heading", { name: "Perfil não encontrado" }),
  ).toBeVisible();
  await b.page.goto(`/@${b.handle}`);
  await expect(counts(b.page)).toContainText("0 seguidores");
  await expect(counts(b.page)).toContainText("0 seguindo");
});
