# ADR-001: Monólito modular em repositório único, Drizzle e convenções de dados

- **Status:** Aceito
- **Data:** 2026-10-09
- **Decisores:** dupla do projeto UpNext (hoje Flomo)

## Contexto

O UpNext (hoje Flomo) é um media tracker social brasileiro, desenvolvido por duas pessoas, com orçamento inicial zero e caminho para o mercado. A arquitetura é API-first (`/api/v1`), com web em Next.js agora e app mobile (Expo) em fase posterior. O banco é PostgreSQL no Supabase, com RLS em todas as tabelas. Estatísticas avançadas e descoberta personalizada virão na Fase 3 e dependem de consultas SQL pesadas sobre histórico de visualizações.

Era preciso decidir a estrutura do repositório, o ORM e as convenções de dados antes de escrever código.

## Decisão

### 1. Monólito modular em repositório único

Um único repositório Next.js (App Router, TypeScript) com camadas separadas por pasta:

```
src/
  domain/      regras de negócio e casos de uso, TypeScript puro
  infra/       banco (Drizzle), gateway do TMDB, jobs, e-mail
  contracts/   schemas Zod e DTOs da API (futuro api-client)
  app/         Next.js: páginas e route handlers de /api/v1
docs/
  adr/         decisões de arquitetura
```

### 2. Regra de dependência, imposta por ferramenta

- `domain/` não importa `next`, `react`, `infra/`, `app/`, `drizzle-orm` nem `@supabase/*`.
- `infra/` pode importar `domain/`.
- `app/` pode importar `domain/`, `infra/` e `contracts/`.
- `contracts/` importa somente `zod`.

A regra é imposta com `no-restricted-imports` no ESLint e roda no CI. Quebrar a regra faz o PR falhar.

### 3. Drizzle ORM e drizzle-kit

- Drizzle é o ORM, e o `drizzle-kit` é o **único dono das migrations**, incluindo as políticas de RLS (`pgPolicy`).
- O Supabase CLI não gera migrations. Seeds ficam separados das migrations.
- O schema `auth.users` pertence ao Supabase. A tabela `profiles` apenas referencia `auth.users.id`.

### 4. Convenções de dados

- Meia estrela guardada como `SMALLINT` em décimos de estrela: `half_stars` de 1 a 10, com `CHECK`. Exemplo: 7 equivale a 3,5 estrelas. A conversão para exibição acontece na borda.
- Estado atual separado de histórico: `user_titles` e `user_episode_progress` respondem "o que estou assistindo"; `watch_events`, `ratings` e `activity_events` guardam o histórico. `progress_pct` nunca é fonte da verdade.
- Chaves primárias UUID. IDs do TMDB ficam em `external_ids` e nunca são PK.
- Datas em `timestamptz` (UTC). Chaves estrangeiras com `ON DELETE` explícito. JSONB apenas para payload bruto de provedores.
- RLS habilitada desde a primeira tabela, testada com usuário autenticado, anônimo e service role.

## Alternativas consideradas

| Alternativa                            | Motivo de não adotar agora                                                                                                                                                  |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Monorepo (pnpm workspaces + Turborepo) | O mobile consome a API por HTTP e não reaproveita o `domain/`. Os contratos podem ser extraídos quando o Expo existir. Hoje seria configuração extra sem benefício imediato |
| Prisma                                 | Depende de versões muito recentes para RLS e índices parciais, que são centrais neste modelo. Estatísticas pesadas tendem a exigir SQL cru                                  |
| Migrations pelo Supabase CLI           | Dois geradores de migration causam conflito. Escolhido um único dono                                                                                                        |
| Microserviços                          | Excessivo para o tamanho do time                                                                                                                                            |

## Consequências

**Positivas**

- Menos configuração e deploy simples.
- Regras de negócio isoladas e testáveis sem subir o Next.
- Migrar para monorepo depois é, em essência, mover pastas.
- RLS, CHECKs e índices parciais ficam versionados no schema.

**Negativas e riscos**

- A fronteira entre camadas depende do lint. Desligar ou ignorar a regra quebra a garantia.
- O ecossistema do Drizzle é menor que o do Prisma.
- No plano Free do GitHub, a proteção da `main` em repositório privado não é aplicada. "Nunca dar push direto na `main`" é acordo da dupla.
- A regra de `contracts/` é uma lista de permitidos: dependências novas exigem edição manual do `eslint.config.mjs` (ver `AGENTS.md`).

## Gatilhos para revisar esta decisão

- Início do app Expo, o que provavelmente leva à extração de `contracts/` para um pacote compartilhado.
- Um terceiro artefato implantável, como um worker de jobs separado.
- Entrada de um terceiro integrante no time.
- Migração da organização para GitHub Team (permite recriar a proteção da `main`).

## Referências

- `docs/ARQUITETURA-v1.6-stats-discovery.md`
