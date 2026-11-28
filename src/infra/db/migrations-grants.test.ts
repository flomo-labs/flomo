import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// A partir de 30/10/2026 o Supabase não concede mais grants a tabelas novas
// do schema public. Toda migration depois da 0036 que cria tabela precisa
// conceder, na própria migration, o acesso ao papel que a usa (AGENTS.md,
// "Grants on new tables (#98)"), ou fechar o acesso de propósito com
// `revoke all ... from authenticated` (tabela só de funções security
// definer). As anteriores dependem dos grants padrão do Supabase.
const ULTIMA_SEM_REGRA = 36;
const DIR = fileURLToPath(new URL("../../../drizzle", import.meta.url));

// Só tabelas de `public` entram (funções e tabelas de `app` seguem outras regras).
function tabelasCriadas(sql: string) {
  const re = /create table (?:if not exists )?(?:"?(\w+)"?\.)?"?(\w+)"?/gi;
  return [...sql.matchAll(re)]
    .filter((m) => !m[1] || m[1].toLowerCase() === "public")
    .map((m) => m[2]);
}

// A tabela precisa aparecer em `public` (ou sem schema) logo depois do `on`,
// sozinha ou numa lista separada por vírgulas.
function alvo(tabela: string) {
  return `(?:[\\w."]+\\s*,\\s*)*(?:"?public"?\\.)?"?${tabela}"?\\b`;
}

function concedeAuthenticated(sql: string, tabela: string) {
  const re = new RegExp(
    `grant\\s[^;]*?\\bon\\s+(?:table\\s+)?${alvo(tabela)}[^;]*?\\bto\\s[^;]*\\bauthenticated\\b`,
    "i",
  );
  return re.test(sql);
}

function fechaAuthenticated(sql: string, tabela: string) {
  const re = new RegExp(
    `revoke\\s+all\\s[^;]*?\\bon\\s+(?:table\\s+)?${alvo(tabela)}[^;]*?\\bfrom\\s[^;]*\\bauthenticated\\b`,
    "i",
  );
  return re.test(sql);
}

describe("migrations: GRANT em tabela nova", () => {
  const arquivos = readdirSync(DIR)
    .filter((f) => /^\d{4}_.*\.sql$/.test(f))
    .filter((f) => Number(f.slice(0, 4)) > ULTIMA_SEM_REGRA);

  it.each(arquivos.length ? arquivos : ["(nenhuma migration nova)"])(
    "%s concede acesso às tabelas que cria",
    (arquivo) => {
      if (!arquivos.length) return;
      const sql = readFileSync(join(DIR, arquivo), "utf8");
      for (const tabela of tabelasCriadas(sql)) {
        expect(
          concedeAuthenticated(sql, tabela) || fechaAuthenticated(sql, tabela),
          `${arquivo}: falta "grant ... on public.${tabela} to authenticated" (ou "revoke all ... from authenticated" se a tabela é interna)`,
        ).toBe(true);
      }
    },
  );

  it("encontra as migrations", () => {
    expect(readdirSync(DIR).some((f) => /^\d{4}_.*\.sql$/.test(f))).toBe(true);
  });

  it("não aceita grant em outro schema nem tabela de outro schema", () => {
    expect(
      concedeAuthenticated(
        `grant select on app.follows to authenticated;`,
        "follows",
      ),
    ).toBe(false);
    expect(
      tabelasCriadas(
        `CREATE TABLE "app"."x" (id uuid); CREATE TABLE "y" (id uuid);`,
      ),
    ).toEqual(["y"]);
  });

  it("reconhece o formato esperado", () => {
    const ok = `CREATE TABLE "follows" (id uuid);\n--> statement-breakpoint\ngrant select, insert, delete on public.follows to authenticated;`;
    expect(tabelasCriadas(ok)).toEqual(["follows"]);
    expect(concedeAuthenticated(ok, "follows")).toBe(true);
    expect(
      concedeAuthenticated(`CREATE TABLE "follows" (id uuid);`, "follows"),
    ).toBe(false);
    expect(
      concedeAuthenticated(
        `grant select on public.follows to anon;`,
        "follows",
      ),
    ).toBe(false);
    expect(
      fechaAuthenticated(
        `revoke all on table public.follow_limits from authenticated, anon;`,
        "follow_limits",
      ),
    ).toBe(true);
  });
});
