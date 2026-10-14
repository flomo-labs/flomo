# Troca de ferramentas: o que fazer em cada caso

> Revisar a cada ADR novo que adicione ou troque ferramenta. Decisões relacionadas: ADR-001, ADR-003 e ADR-004.

Este guia diz, para cada ferramenta do Flomo, onde ela está acoplada, o que fazer para trocá-la e quanto isso custa. Ele só continua verdadeiro se as regras da seção 1 forem seguidas no dia a dia.

## 1. Regras que mantêm a troca barata

1. **`domain/` não conhece ferramenta.** Não importa `next`, `react`, `drizzle-orm`, `@supabase/*` nem SDK de terceiros (o lint já barra os principais). Precisa de algo externo? Declare uma interface (porta) em `domain/` e implemente em `infra/`.
2. **Um adaptador por ferramenta, numa pasta só.** Exemplo: `infra/catalog/tmdb/`, `infra/email/resend/`, `infra/auth/supabase/`. Nenhum outro lugar importa o SDK da ferramenta.
3. **Policies de RLS não chamam `auth.uid()` direto.** Usam `app.current_user_id()` (e `app.current_user_has_role(role)` para moderação), funções nossas definidas numa migration. Só elas sabem de onde vem o usuário.
4. **Casos de uso recebem o usuário como parâmetro.** Não leem cookie, cabeçalho nem sessão. Quem resolve "quem é o usuário" é a borda (`app/` e o adaptador de auth).
5. **Contratos em Zod em `contracts/`.** A web e o futuro app mobile validam com os mesmos schemas; trocar o framework web não mexe neles.
6. **Ids externos nunca são chave primária.** Ficam em `external_ids` com o nome do provedor.
7. **Variáveis de ambiente com nome de função, não de fornecedor, quando der.** Exemplo: `DATABASE_URL`, `EMAIL_FROM`. As específicas (`SUPABASE_SECRET_KEY`, `TMDB_API_KEY`) ficam restritas ao adaptador.
8. **SQL específico de fornecedor fica isolado e comentado** nas migrations (triggers em `auth.users`, `pg_cron`), para ser fácil achar o que reescrever.

## 2. Mapa de acoplamento

| Ferramenta | Papel | Onde vive | Custo de troca |
| ---------- | ----- | --------- | -------------- |
| PostgreSQL | Banco | Schema, migrations, policies | Alto, e não previsto: é a base portável |
| Supabase Auth | Login (Google, e-mail) | `infra/auth/supabase/`, `app.current_user_id()`, trigger de perfil, FK de `profiles` | Alto |
| Supabase (hospedagem do Postgres) | Banco gerenciado | `DATABASE_URL` | Baixo a médio |
| Supabase Storage | Avatares | `infra/storage/supabase/` | Baixo |
| Drizzle | ORM e migrations | `infra/db/` e `drizzle/` | Médio |
| postgres.js | Driver | `infra/db/client.ts` | Baixo |
| Next.js | Web | `app/` | Médio a alto |
| Vercel | Hospedagem da web | Configuração do projeto, cron (se usado) | Baixo a médio |
| TMDB | Catálogo | `infra/catalog/tmdb/` | Médio (dados e termos) |
| TVmaze | Calendário | `infra/catalog/tvmaze/` | Baixo |
| Resend | E-mail | `infra/email/resend/` | Baixo |
| `pg_cron` | Jobs | Migrations SQL e rotas de job | Baixo a médio |
| Sentry / analytics | Erros e métricas | `instrumentation`, `infra/observability/` | Baixo |
| next-intl | Textos e i18n | `app/` e arquivos de mensagens | Médio |
| Tailwind, shadcn/ui, Base UI | UI | `components/`, `app/` | Alto (é visual), sem efeito no resto |
| Zod | Validação | `contracts/` | Médio (está em toda borda) |
| Vitest | Testes | `*.test.ts`, `vitest.config.mts` | Baixo |

## 3. Passo a passo por ferramenta

### 3.1 Supabase Auth → outro provedor de login (Auth.js, Clerk, Cognito, Firebase Auth…)

1. Implementar o novo adaptador em `infra/auth/<novo>/` cumprindo a mesma porta (obter usuário da requisição por cookie ou token Bearer, sair, etc.).
2. Criar a tabela de usuários própria (ou a do novo provedor) e trocar a FK de `profiles.id` (hoje para `auth.users.id`). Manter os mesmos UUIDs dos usuários existentes.
3. Reescrever `app.current_user_id()` para ler o usuário do jeito novo (por exemplo, de um `set_config` feito pelo helper `withUser`). As policies não mudam.
4. Trocar o trigger que cria perfil por um hook do novo provedor ou por um caso de uso no primeiro login.
5. Migrar usuários e vínculos com o Google (exportar de `auth.users` e `auth.identities`). Avisar que pode ser preciso entrar de novo.
6. App mobile: trocar o SDK de login e publicar versão nova antes de desligar o antigo.

Riscos: sessões derrubadas, contas duplicadas se o e-mail não bater. Esforço: G.

### 3.2 Supabase (hospedagem do Postgres) → outro Postgres gerenciado (Neon, RDS, Railway…)

1. Se o Auth continuar no Supabase, essa troca não faz sentido sozinha: ver 3.1 primeiro.
2. `pg_dump` do banco e restauração no destino, numa janela de manutenção.
3. Recriar papéis usados nas policies (`authenticated`, `anon`) e extensões (`pg_cron`, `pgcrypto`…) ou substituí-las (ver 3.10).
4. Trocar `DATABASE_URL` e `DATABASE_URL_MIGRATIONS`; ajustar o modo do pooler do novo serviço.
5. Rodar a suíte de integração (RLS incluída) contra o destino antes de virar a chave.

Esforço: M.

### 3.3 Supabase Storage → outro armazenamento (S3, R2, Cloudinary…)

1. Novo adaptador em `infra/storage/<novo>/` com a mesma porta (enviar, gerar URL, apagar).
2. Copiar os arquivos existentes e reescrever `profiles.avatar_url` em lote.
3. Recriar as regras de acesso (no Supabase são policies de Storage).

Esforço: P.

### 3.4 Drizzle → outro ORM ou query builder (Kysely, Prisma…)

1. Marcar a última migration do Drizzle como baseline no novo gerador (não reaplicar o histórico).
2. Reescrever `infra/db/` (schema e repositórios). Interfaces em `domain/` não mudam.
3. Recriar o helper `withUser` (transação com `set_config` e `set local role`).
4. Garantir que o novo gerador saiba lidar com policies e SQL customizado, ou mantê-los em migrations SQL à mão.
5. Rodar testes de integração.

Esforço: M a G, proporcional ao número de repositórios.

### 3.5 postgres.js → `pg` (node-postgres) ou driver serverless

Trocar a criação do cliente em `infra/db/client.ts` e o adaptador do Drizzle correspondente; manter `prepare: false` (ou equivalente) no pooler em modo transação. Esforço: P.

### 3.6 Next.js → outro framework web (Remix/React Router, SvelteKit, Astro…)

1. `domain/` e `contracts/` continuam iguais.
2. Reescrever `app/`: páginas, Server Actions, route handlers de `/api/v1` e o `proxy` de sessão.
3. Reaproveitar componentes React se o novo framework for React; caso contrário, refazer a UI.
4. Revisar autenticação por cookie no novo framework (o adaptador de auth já é isolado).

Esforço: G. O app mobile não é afetado se `/api/v1` mantiver o contrato.

### 3.7 Vercel → outro host (Cloudflare Workers com OpenNext, Netlify, Render, Fly, VPS com Docker)

1. Conferir quais recursos do Next o host suporta (cache, imagens, `proxy`).
2. Mover variáveis de ambiente e domínio; atualizar as URLs de redirect do OAuth (Google e provedor de auth).
3. Se houver Vercel Cron, migrar para `pg_cron` ou o agendador do host.
4. Trocar Vercel Analytics, se usado (ver 3.11).

Esforço: P a M.

### 3.8 TMDB → outra fonte de catálogo (TheTVDB, Trakt, fonte paga)

1. Novo adaptador em `infra/catalog/<novo>/` com a mesma porta do Catalog Gateway.
2. Mapear ids: gravar os ids do novo provedor em `external_ids` ao lado dos do TMDB, usando um id em comum (IMDb) quando houver.
3. Revisar campos que só o TMDB fornece (onde assistir por país, traduções pt-BR) e o que fica sem equivalente.
4. Apagar ou expirar o cache em `provider_payloads` do provedor antigo conforme os termos dele.
5. Atualizar atribuição na página `/sobre` e em `docs/THIRD_PARTY.md`.

Riscos: lacunas de tradução e de numeração de episódios. Esforço: M a G.

### 3.9 TVmaze → outra fonte de calendário

Novo adaptador em `infra/catalog/<novo>/`, mapear ids em `external_ids`, atualizar atribuição. Esforço: P.

### 3.10 `pg_cron` → outro agendador (Inngest, Vercel Cron, Trigger.dev, cron do host)

1. Os jobs são casos de uso em `domain/` chamados por uma rota protegida ou por SQL; manter esse formato.
2. Recriar os agendamentos no novo serviço apontando para as mesmas rotas.
3. Remover os `cron.schedule(...)` numa migration nova.

Esforço: P.

### 3.11 Resend, Sentry, analytics

Cada um tem um adaptador em `infra/`. Trocar = novo adaptador + variáveis de ambiente; para e-mail, também reconfigurar o domínio (SPF, DKIM). Analytics com cookies exige revisar o consentimento (LGPD). Esforço: P.

### 3.12 next-intl → outra biblioteca de i18n

Os textos ficam em arquivos de mensagens por chave; trocar a biblioteca é trocar o carregamento e a função de tradução em `app/`. Esforço: M (muitos arquivos, mudança mecânica).

### 3.13 UI (Tailwind, shadcn/ui, Base UI)

Afeta só `components/` e `app/`. Trocar componente a componente, sem big bang. Esforço: G se for tudo, P por componente.

### 3.14 Zod e Vitest

Zod está em toda borda: trocar exige reescrever `contracts/` (usar uma biblioteca compatível com o padrão Standard Schema reduz o impacto). Vitest → Jest ou outro: ajustar configuração e alguns imports. Esforço: M e P.

## 4. Antes de qualquer troca

1. Abrir um ADR com o motivo, a alternativa escolhida e o plano de migração.
2. Fazer a troca atrás da porta existente, com os testes de domínio e integração passando antes e depois.
3. Atualizar este guia, o `.env.example` e o `docs/THIRD_PARTY.md`.
