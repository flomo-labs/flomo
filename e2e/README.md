# E2E (Playwright)

Teste de ponta a ponta do fluxo do spike: entrar, buscar, abrir título, marcar
episódio, dar 3,5★, escrever 2 comentários e abrir `/em-breve`
(`fluxo-spike.spec.ts`). Roda no CI, no job `e2e`.

## O que ele usa

- **Supabase local** (`supabase/config.toml`): só Postgres e Auth, com o schema
  das migrations do Drizzle. Nada do flomo-dev nem da produção.
- **Login:** o app só oferece Google, que não dá para automatizar. O teste cria
  um usuário por e-mail e senha no Supabase local e põe no navegador os mesmos
  cookies de sessão que o app gravaria (`support/auth.ts`). Daí em diante, tudo
  passa pelo app.
- **TMDB falso** (`tmdb-fake/server.mjs`): uma série e um filme inventados. O
  app aponta para ele com `TMDB_BASE_URL`, variável que fica vazia fora do E2E.

## Rodar no seu computador

Precisa de Docker e da CLI do Supabase (`pnpm dlx supabase@2.121.0`).

1. `pnpm dlx supabase@2.121.0 start`
2. `pnpm dlx supabase@2.121.0 status -o env` e anote `API_URL`,
   `PUBLISHABLE_KEY` (ou `ANON_KEY`) e `DB_URL`.
3. Num terminal só para o E2E, defina `NEXT_PUBLIC_SUPABASE_URL` (o `API_URL`),
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL` e
   `DATABASE_URL_MIGRATIONS` (os dois com o `DB_URL`),
   `NEXT_PUBLIC_SITE_URL=http://localhost:3000`,
   `TMDB_READ_ACCESS_TOKEN=e2e-tmdb-falso` e
   `TMDB_BASE_URL=http://localhost:3999/3`.
4. `pnpm db:migrate`
5. `pnpm build` (o build guarda as variáveis `NEXT_PUBLIC_*`; não reaproveite
   um build feito com o `.env.local`)
6. `pnpm exec playwright install chromium` (só na primeira vez; se já houver
   um Chromium instalado em outro lugar, aponte para ele com
   `E2E_CHROMIUM_PATH`)
7. `pnpm test:e2e`
8. `pnpm dlx supabase@2.121.0 stop` ao terminar.

O teste se recusa a rodar se `NEXT_PUBLIC_SUPABASE_URL` ou `DATABASE_URL` não
apontarem para `localhost`, para não gravar nada no flomo-dev por engano.

Cada execução cria um usuário novo; o banco local pode ser zerado com
`supabase db reset`, seguido de `pnpm db:migrate`.
