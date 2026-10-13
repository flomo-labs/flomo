# Fase 0: checklist de bootstrap

Objetivo: login com Google funcionando localmente, banco com a primeira migration e CI verde. O deploy depende de uma decisão sobre a Vercel (ver Etapa 9).

**Regra de trabalho:** a partir daqui, nada de push direto na `main`. Cada bloco abaixo é um PR pequeno, revisado pela outra pessoa, com as labels `mvp` ou `spike`.

---

## Etapa 0: ambiente

- [ ] Node LTS instalado (`node --version`)
- [ ] pnpm disponível: `corepack enable` e depois `pnpm --version`
- [ ] Criar a branch do primeiro PR:

```powershell
cd <pasta-do-projeto>
git checkout -b chore/bootstrap
```

---

## PR 1: scaffold, lint de camadas, testes e CI

### 1.1 Gerar o projeto Next.js sem conflitar com o README

O `create-next-app` reclama de pasta com arquivos. Gere em pasta temporária e copie:

```powershell
cd <pasta-dos-projetos>
pnpm create next-app@latest flomo-tmp --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm
robocopy flomo-tmp flomo /E /XD .git node_modules /XF README.md
Remove-Item -Recurse -Force flomo-tmp
cd flomo
pnpm install
```

O `robocopy` retorna códigos de 0 a 7 em caso de sucesso, então não estranhe a saída. Confira que o `.gitignore` gerado ignora `.env*` (o `.env.example` é a exceção que será commitada).

Fixe a versão do pnpm no `package.json`, necessária para o CI:

```powershell
corepack use pnpm@latest
```

### 1.2 shadcn/ui em tema escuro

```powershell
pnpm dlx shadcn@latest init
```

Para deixar o escuro como padrão, coloque `className="dark"` na tag `<html>` do `src/app/layout.tsx`. A cor de destaque (magenta/rosa dos protótipos) fica para o design system do spike.

### 1.3 Estrutura de camadas

```powershell
mkdir src\domain, src\infra, src\contracts
New-Item src\domain\.gitkeep, src\infra\.gitkeep, src\contracts\.gitkeep -ItemType File
```

### 1.4 Lint de camadas

No `eslint.config.mjs` gerado, adicione um objeto de configuração (adapte ao formato do arquivo):

```js
{
  files: ["src/domain/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": ["error", {
      patterns: [
        { group: ["next", "next/*", "react", "react/*", "react-dom", "react-dom/*"],
          message: "domain/ não pode depender de Next nem de React." },
        { group: ["@/infra/*", "@/app/*"],
          message: "domain/ não pode depender de infra/ nem de app/." },
        { group: ["drizzle-orm", "drizzle-orm/*", "@supabase/*"],
          message: "domain/ não pode depender de banco nem de SDK externo." },
      ],
    }],
  },
},
{
  files: ["src/contracts/**/*.ts"],
  rules: {
    "no-restricted-imports": ["error", {
      patterns: [{ group: ["@/domain/*", "@/infra/*", "@/app/*", "next", "next/*", "react"],
        message: "contracts/ só pode importar zod." }],
    }],
  },
},
```

Teste a regra: crie temporariamente `src/domain/teste.ts` com `import "next/server"`, rode `pnpm lint`, confirme o erro e apague o arquivo.

### 1.5 Vitest, Zod e scripts

```powershell
pnpm add zod
pnpm add -D vitest
```

No `package.json`, em `scripts`:

```json
"typecheck": "tsc --noEmit",
"test": "vitest run"
```

Crie um teste simples em `src/domain` para provar que o pipeline roda (por exemplo, uma função que converte `half_stars` em estrelas, com testes para 1, 7 e 10).

### 1.6 CI (GitHub Actions)

`.github/workflows/ci.yml`. Usa só actions do GitHub e o corepack, para respeitar a política da organização (actions criadas pelo GitHub):

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: corepack enable
      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
```

Se o `build` falhar por falta de variáveis de ambiente, adicione valores falsos em `env:` no passo de build (nunca secrets reais).

### 1.7 `.env.example`

```
# Públicas (podem ir ao browser)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Somente servidor. Nunca usar prefixo NEXT_PUBLIC_
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
TMDB_API_KEY=
```

No painel do Supabase essas chaves podem aparecer com nomes novos (publishable e secret key). O papel é o mesmo: a pública vai no `NEXT_PUBLIC_SUPABASE_ANON_KEY`, a secreta no `SUPABASE_SERVICE_ROLE_KEY`.

### 1.8 Fechar o PR 1

```powershell
git add .
git commit -m "chore: bootstrap Next.js com camadas, lint, testes e CI"
git push -u origin chore/bootstrap
```

Abra o PR no GitHub (o template de PR aparece automaticamente), confira o CI e peça a revisão da outra pessoa antes de mesclar com *Squash and merge*.

---

## PR 2: Supabase, Drizzle e primeira migration

### 2.1 Projeto Supabase

- [ ] Criar o projeto no painel do Supabase, região **South America (São Paulo)**.
- [ ] Guardar a senha do banco em local seguro.
- [ ] Copiar URL e chaves para o `.env.local` (arquivo ignorado pelo Git).
- [ ] Conferir se projetos do plano gratuito pausam por inatividade (consulte a página de planos do Supabase). Se pausar, acesse o projeto de tempos em tempos.

### 2.2 `DATABASE_URL`

No painel, abra a tela de conexão do projeto (botão *Connect*, o nome pode variar). Use a **Session pooler** para rodar migrations a partir do seu computador. A conexão direta pode exigir IPv6, que muitas redes domésticas não têm. Em produção na Vercel, a conexão em modo transação é a indicada para ambientes serverless. Confira o texto do próprio painel.

### 2.3 Drizzle

```powershell
pnpm add drizzle-orm postgres dotenv
pnpm add -D drizzle-kit
```

`drizzle.config.ts` na raiz:

```ts
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/infra/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
  entities: { roles: { provider: "supabase" } },
});
```

### 2.4 Primeira tabela: `profiles` (com RLS)

Em `src/infra/db/schema/profiles.ts`, um ponto de partida. Confira os nomes dos exports de `drizzle-orm/supabase` na versão instalada e ajuste conforme os erros de tipo:

```ts
import { sql } from "drizzle-orm";
import { boolean, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole, authUsers } from "drizzle-orm/supabase";

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().references(() => authUsers.id, { onDelete: "cascade" }),
    handle: text("handle").notNull().unique(),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    isPrivate: boolean("is_private").notNull().default(false),
    locale: text("locale").notNull().default("pt-BR"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    pgPolicy("profiles_select_public_or_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${t.isPrivate} = false or (select auth.uid()) = ${t.id}`,
    }),
    pgPolicy("profiles_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`(select auth.uid()) = ${t.id}`,
      withCheck: sql`(select auth.uid()) = ${t.id}`,
    }),
  ],
).enableRLS();
```

Crie o `src/infra/db/schema/index.ts` exportando a tabela, depois:

```powershell
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

Confira no painel do Supabase (Table Editor) que a tabela existe com RLS ativa. Adicione os scripts `db:generate` e `db:migrate` ao `package.json`.

**Regra a partir daqui:** nunca editar uma migration já aplicada. As demais tabelas do modelo (catálogo, biblioteca, stubs de stats) entram nas próximas migrations durante o spike, em PRs separados.

---

## PR 3: login com Google

### 3.1 Credenciais no Google Cloud

- [ ] Em console.cloud.google.com, criar um projeto (ex.: "Flomo").
- [ ] Configurar a tela de consentimento OAuth (nome do app, e-mail de suporte).
- [ ] Criar um **OAuth client ID** do tipo *Web application*.
- [ ] Em *Authorized redirect URIs*, adicionar: `https://<ref-do-projeto>.supabase.co/auth/v1/callback` (o endereço exato aparece na tela do provider Google no Supabase).
- [ ] Guardar Client ID e Client secret.

### 3.2 Supabase

- [ ] **Authentication → Providers → Google**: ativar e colar Client ID e secret.
- [ ] **Authentication → URL Configuration**: definir o *Site URL* como `http://localhost:3000` e adicionar `http://localhost:3000/**` nas redirect URLs. A URL de produção entra quando houver deploy.

### 3.3 No app

```powershell
pnpm add @supabase/supabase-js @supabase/ssr
```

Implementar: cliente Supabase para servidor e para browser, página `/login` com botão "Entrar com Google", rota `/auth/callback` e a atualização de sessão por cookie. Siga o guia atual do Supabase para Next.js App Router, pois o arquivo de middleware mudou de nome em versões recentes do Next.

Na primeira vez que o usuário entra, criar o `profiles` no próprio callback (upsert, com `handle` derivado do nome e verificação de duplicidade), em vez de usar trigger no banco.

Critério: login com Google funciona localmente e a sessão persiste ao recarregar a página.

---

## PR 4: `/em-breve`

- [ ] Criar `content/roadmap.ts` com os itens: Recomendações personalizadas; Gamificação (streaks, medalhas, ranking); Mini-jogos de descoberta; Notícias por gosto; Comunidades e convites; Ferramenta de escolha em grupo; Import Trakt / TV Time; App iOS e Android; Estatísticas avançadas; Web Push e alertas ricos.
- [ ] Cada item com `status` (`planned`, `building`, `shipped`).
- [ ] Página `/em-breve` pública que renderiza a lista.

---

## Etapa 9: deploy (decisão pendente)

**Restrição encontrada:** o plano Hobby da Vercel não permite deploy a partir de repositório **privado de organização do GitHub**. Segundo a documentação citada por funcionários da Vercel em fóruns, é preciso o plano Pro, tornar o repo público ou mover o repo para conta pessoal. Verifique a regra atual na documentação da Vercel antes de decidir.

| Opção | Custo | Observações |
|---|---|---|
| Vercel Pro | Pago | Resolve de vez, com colaboração em equipe |
| Repo público | Zero | Código exposto antes de a marca estar resolvida |
| Repo em conta pessoal | Zero | No Hobby, só o dono do time Vercel dispara deploys, o que atrapalha a dupla |
| Deploy via GitHub Actions com Vercel CLI | Zero | Contorno usado por outros usuários. Pode mudar, e consome minutos de Actions |

Nada nas etapas anteriores depende dessa escolha. Decidam antes do PR 4 ou logo depois.

---

## Pronto quando

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm build` passam localmente e no CI
- [ ] A regra de camadas barra um import proibido em `domain/`
- [ ] A migration de `profiles` está aplicada no Supabase com RLS ativa
- [ ] Login com Google funciona localmente
- [ ] `/em-breve` exibe o roadmap
- [ ] Decisão de deploy tomada

Em seguida começa o spike vertical: busca, título, marcar episódio, avaliação de 3,5 estrelas, dois reviews.
