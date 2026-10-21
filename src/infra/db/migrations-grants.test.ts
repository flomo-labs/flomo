import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// A partir de 30/10/2026 o Supabase não concede mais grants a tabelas novas
// do schema public. Toda migration depois da 0020 que cria tabela precisa
// conceder, na própria migration, o acesso ao papel que a usa (AGENTS.md,
// "Grants em tabelas novas"). As anteriores já têm os grants padrão.
const ULTIMA_SEM_REGRA = 20;
const DIR = join(process.cwd(), "drizzle");

function tabelasCriadas(sql: string) {
  const re = /create table (?:if not exists )?(?:"?public"?\.)?"?(\w+)"?/gi;
  return [...sql.matchAll(re)].map((m) => m[1]);
}

function concedeAuthenticated(sql: string, tabela: string) {
  const re = new RegExp(
    `grant\\s[^;]*\\bon\\s+(?:table\\s+)?[^;]*\\b${tabela}\\b[^;]*\\bto\\s[^;]*\\bauthenticated\\b`,
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
          concedeAuthenticated(sql, tabela),
          `${arquivo}: falta "grant ... on public.${tabela} to authenticated"`,
        ).toBe(true);
      }
    },
  );

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
  });
});
