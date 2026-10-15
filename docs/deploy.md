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
5. Aplicar as migrations, no PC, sem editar o `.env.local` (a variável do terminal vale mais que a do arquivo) e sem deixar a URL no histórico. No PowerShell, com a URL do pooler em modo **sessão** (porta 5432) do `flomo-prod`:

   ```powershell
   $env:DATABASE_URL_MIGRATIONS = Read-Host "URL do flomo-prod (sessão, 5432)"
   pnpm db:migrate
   Remove-Item Env:DATABASE_URL_MIGRATIONS
   ```

   O `Read-Host` pede a URL na hora, então ela não fica gravada no histórico; o `Remove-Item` limpa a variável do terminal.
6. Conferir em **Database > Tables** que `profiles` existe com RLS ativa.

## 2. Vercel

1. Importar `flomo-labs/flomo` (repositório público, então o plano Hobby serve; Hobby é uso **não comercial**, ver `docs/regras-de-negocio.md` quando houver monetização).
2. Framework Next.js (detectado). Região vem do `vercel.json`.
3. Variáveis de ambiente (Settings > Environment Variables). Marque os ambientes indicados:

| Variável | Production | Preview |
| -------- | ---------- | ------- |
| `NEXT_PUBLIC_SITE_URL` | URL de produção | (não definir; marque **só** Production. Em preview o app usa o host da requisição) |
| `NEXT_PUBLIC_SUPABASE_URL` | `flomo-prod` | `flomo-dev` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `flomo-prod` | `flomo-dev` |
| `SUPABASE_SECRET_KEY` | `flomo-prod` | `flomo-dev` |
| `DATABASE_URL` | `flomo-prod`, pooler em modo **transação** (6543) | `flomo-dev`, idem |
| `TMDB_API_KEY` | chave do TMDB | a mesma |

`DATABASE_URL_MIGRATIONS`, `DATABASE_URL_TEST` e `FLOMO_PROD_DB_REF` **não** vão para a Vercel: migrations e testes rodam no PC/CI.

4. **Settings > Git**: produção = branch `main`. Em **Deployment Protection**, deixe a proteção padrão dos previews.
5. Em **Authentication > URL Configuration** do `flomo-dev`, acrescente às Redirect URLs `https://flomo-*-<escopo-da-vercel>.vercel.app/auth/callback` (o escopo é o slug do time/conta na Vercel, visível na URL de qualquer preview). **Não use `https://*.vercel.app/**`**: qualquer pessoa publica um app em `.vercel.app` e receberia o código do login.

## 3. Google OAuth em produção

1. Google Cloud > Google Auth Platform > **Clientes**: no cliente de produção (ou um novo, "Flomo prod"), adicionar a URI de redirecionamento `https://<ref-do-flomo-prod>.supabase.co/auth/v1/callback` e a origem JavaScript da URL de produção.
2. Supabase `flomo-prod`: colar Client ID e Secret em Providers > Google.
3. **Branding**: página inicial, `/privacidade` e `/termos` da URL de produção; domínio autorizado = domínio do app.
4. Conferir a tela de consentimento com `/privacidade` e `/termos`, e só então **Publicar app** (sai de "Testando"). Os escopos são só `openid`, e-mail e perfil (não sensíveis: sem verificação do Google).

## 4. Depois do deploy

- Testar em produção: entrar com Google, escolher o nome, `/configuracoes`, sair; cookie `sb-…-auth-token` com `HttpOnly` e `Secure`.
- Dependabot e o alerta de segurança da `main`: tratar antes de divulgar a URL.
- Trocar `contactEmail` em `src/content/legal.ts` quando houver domínio/e-mail do projeto.
