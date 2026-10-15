# Deploy (Vercel + Supabase de produção)

Passos feitos à mão nos consoles. Nada aqui é segredo: valores reais ficam só nos painéis (Vercel, Supabase, Google Cloud).

## Ambientes

| Ambiente | App | Banco / Auth |
| -------- | --- | ------------ |
| Local | `pnpm dev` | `flomo-dev` |
| Preview (cada PR) | Vercel Preview | `flomo-dev` |
| Produção | Vercel Production (branch `main`) | `flomo-prod`, **Data API desligada** |

Funções da Vercel em `gru1` (São Paulo, ver `vercel.json`), a mesma região do Supabase, para cada query não atravessar o continente.

## 1. Supabase de produção (`flomo-prod`)

1. Novo projeto, região **South America (São Paulo)**, senha do banco no gerenciador de senhas.
2. **Project Settings > Data API**: desligar. O app acessa dados só pelo Drizzle (ADR-003/004); com a Data API ligada, um usuário logado altera o próprio perfil direto pela chave publishable, sem passar pelos casos de uso.
3. **Authentication > Sign In / Providers**: Google ligado (passo 3); telefone, anônimo e e-mail desligados até a Fase 1.7.
4. **Authentication > URL Configuration**: Site URL = URL de produção; Redirect URLs = `<URL de produção>/auth/callback`.
5. Aplicar as migrations (no PC, com `.env.local` apontando **temporariamente** `DATABASE_URL_MIGRATIONS` para o pooler em modo sessão do `flomo-prod`, porta 5432): `pnpm db:migrate`. Depois volte o `.env.local` para o `flomo-dev`. Alternativa sem mexer no `.env.local`: `DATABASE_URL_MIGRATIONS='<url>' pnpm db:migrate` (PowerShell: `$env:DATABASE_URL_MIGRATIONS='<url>'; pnpm db:migrate`).
6. Conferir em **Database > Tables** que `profiles` existe com RLS ativa.

## 2. Vercel

1. Importar `flomo-labs/flomo` (repositório público, então o plano Hobby serve; Hobby é uso **não comercial**, ver `docs/regras-de-negocio.md` quando houver monetização).
2. Framework Next.js (detectado). Região vem do `vercel.json`.
3. Variáveis de ambiente (Settings > Environment Variables). Marque os ambientes indicados:

| Variável | Production | Preview |
| -------- | ---------- | ------- |
| `NEXT_PUBLIC_SITE_URL` | URL de produção | (não definir: o app usa o endereço do deploy) |
| `NEXT_PUBLIC_SUPABASE_URL` | `flomo-prod` | `flomo-dev` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `flomo-prod` | `flomo-dev` |
| `SUPABASE_SECRET_KEY` | `flomo-prod` | `flomo-dev` |
| `DATABASE_URL` | `flomo-prod`, pooler em modo **transação** (6543) | `flomo-dev`, idem |
| `TMDB_API_KEY` | chave do TMDB | a mesma |

`DATABASE_URL_MIGRATIONS`, `DATABASE_URL_TEST` e `FLOMO_PROD_DB_REF` **não** vão para a Vercel: migrations e testes rodam no PC/CI.

4. **Settings > Git**: produção = branch `main`. Em **Deployment Protection**, deixe a proteção padrão dos previews.
5. Em **Authentication > URL Configuration** do `flomo-dev`, acrescente `https://*.vercel.app/auth/callback` às Redirect URLs, para o login funcionar nos previews.

## 3. Google OAuth em produção

1. Google Cloud > Google Auth Platform > **Clientes**: no cliente de produção (ou um novo, "Flomo prod"), adicionar a URI de redirecionamento `https://<ref-do-flomo-prod>.supabase.co/auth/v1/callback` e a origem JavaScript da URL de produção.
2. Supabase `flomo-prod`: colar Client ID e Secret em Providers > Google.
3. **Branding**: página inicial, `/privacidade` e `/termos` da URL de produção; domínio autorizado = domínio do app.
4. Conferir a tela de consentimento com `/privacidade` e `/termos`, e só então **Publicar app** (sai de "Testando"). Os escopos são só `openid`, e-mail e perfil (não sensíveis: sem verificação do Google).

## 4. Depois do deploy

- Testar em produção: entrar com Google, escolher o nome, `/configuracoes`, sair; cookie `sb-…-auth-token` com `HttpOnly` e `Secure`.
- Dependabot e o alerta de segurança da `main`: tratar antes de divulgar a URL.
- Trocar `contactEmail` em `src/content/legal.ts` quando houver domínio/e-mail do projeto.
