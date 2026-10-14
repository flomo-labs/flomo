# Flomo

Media tracker social brasileiro: acompanhe filmes, séries e outros tipos de mídia, marque episódios, avalie com meia estrela, escreva reviews, crie listas e siga amigos.

> Status: **pré-spike**. Nenhum código de produto ainda. Arquitetura definida em [`docs/`](docs/).

## Documentação

- [`docs/ARQUITETURA-v1.6-stats-discovery.md`](docs/ARQUITETURA-v1.6-stats-discovery.md): estatísticas, Explorar e referências de produto
- [`docs/adr/`](docs/adr/): decisões arquiteturais (ADRs curtos)
- [`docs/regras-de-negocio.md`](docs/regras-de-negocio.md): regras de negócio e onde cada uma é garantida
- [`docs/troca-de-ferramentas.md`](docs/troca-de-ferramentas.md): onde cada ferramenta está acoplada e como trocá-la
- [`docs/fase-0-checklist.md`](docs/fase-0-checklist.md): checklist original da Fase 0 (histórico; ver o aviso no topo)
- [`docs/THIRD_PARTY.md`](docs/THIRD_PARTY.md): atribuições de terceiros

## Stack

TypeScript · Next.js (App Router) · shadcn/ui + Tailwind · Supabase (Postgres, Auth Google, Storage) · Drizzle + postgres.js · Zod · Vercel · TMDB (server-side)

Estilo: monólito modular com casos de uso em `domain/`; a API `/api/v1` é uma camada fina sobre eles e nasce junto com o app mobile ([ADR-004](docs/adr/ADR-004-casos-de-uso-primeiro.md)). O domínio nunca importa `next` nem `react`. Dados de usuário passam pelo RLS do Postgres ([ADR-003](docs/adr/ADR-003-rls-drizzle-conexoes-e-perfil.md)).

## Como rodar localmente

> Preencher na Fase 0, quando o bootstrap existir.

1. Pré-requisitos: Node 22 LTS e pnpm 10 (`npm install -g pnpm@10`)
2. Copie `.env.example` para `.env.local` e preencha as variáveis (`Copy-Item .env.example .env.local` no PowerShell, `cp .env.example .env.local` no Linux/macOS)
3. `pnpm install`
4. `pnpm db:migrate` para aplicar as migrations no seu projeto Supabase de desenvolvimento
5. `pnpm dev`

### Banco de dados

- Schema em `src/infra/db/schema/`, migrations em `drizzle/`. SQL que o Drizzle não modela (funções, triggers) entra em migration escrita à mão: `pnpm db:generate --custom --name=descricao`.
- Mudou o schema: `pnpm db:generate`, revise o SQL gerado e só então `pnpm db:migrate`.
- `pnpm test:integration` testa policies e triggers contra o banco do `.env.local`; cada teste é desfeito no fim e não grava nada.

### Variáveis de ambiente

Veja `.env.example`. Nunca commitar secrets. Chaves server-only (TMDB, chave secreta do Supabase) jamais usam o prefixo `NEXT_PUBLIC_`.

## Performance budgets (MVP)

| Métrica                      | Alvo         |
| ---------------------------- | ------------ |
| API p95 com cache            | < 150–200 ms |
| API p95 busca sem cache TMDB | < 800 ms     |
| LCP página de título (4G)    | < 2,5 s      |
| INP ao avaliar/marcar        | < 200 ms     |

## Fluxo de trabalho

- Nunca fazer push direto na `main`: toda mudança entra por PR com CI verde (lint, typecheck, test, build). O ruleset da `main` exige PR, 1 aprovação e o check `verify`
- Um revisor da dupla por PR
- Branches no formato `tipo/descricao-curta` (`feat/`, `fix/`, `chore/`, `docs/`)
- [Conventional Commits](https://www.conventionalcommits.org/pt-br/) e PRs pequenos
- **Estratégia de merge: "Create a merge commit"**, sempre. Não usar squash nem rebase. O histórico completo da branch fica na `main`, e `git branch --merged` mostra o que já entrou. Como os commits da branch ficam no histórico, mantenha-os limpos: mensagens em Conventional Commits, sem "wip" nem commits repetidos
- Labels de issue: `spike`, `mvp`, `em-breve`, `bug`, `docs`

## Spike vertical (checklist)

Fluxo-alvo: login Google → buscar → abrir título → marcar episódio → avaliar 3,5★ → 2 reviews → `/em-breve`.

- [ ] Catalog Gateway (search, details, cache, credits)
- [ ] Páginas de busca e título
- [ ] Schema de biblioteca
- [ ] Caso de uso `MarkEpisodeWatched` (transação, idempotente)
- [ ] Biblioteca + progresso + próximo episódio
- [ ] Ratings + reviews + `StarRating`
- [ ] Perfil mínimo
- [ ] RLS + testes de domínio
- [ ] `/em-breve`

## Licença

Todos os direitos reservados. O código é público para leitura e avaliação do TCC, mas não há licença de uso, cópia ou redistribuição.

Dados de catálogo e imagens fornecidos pelo [TMDB](https://www.themoviedb.org/). Este produto usa a API do TMDB mas não é endossado nem certificado por ele.
