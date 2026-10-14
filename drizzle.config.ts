import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local", quiet: true });

// Migrations usam o pooler em modo sessão (ADR-003). Falhar cedo evita
// rodar o drizzle-kit contra a URL do app (modo transação) por engano.
const url = process.env.DATABASE_URL_MIGRATIONS;
if (!url) {
  throw new Error(
    "DATABASE_URL_MIGRATIONS não definida. Preencha no .env.local (pooler do Supabase em modo sessão, porta 5432).",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/infra/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: { url },
  // Não criar nem apagar os papéis que o Supabase já tem (anon, authenticated...).
  entities: { roles: { provider: "supabase" } },
  strict: true,
  verbose: true,
});
