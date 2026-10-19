## Nome do produto: Flomo (não use "UpNext")

O produto se chama **Flomo**. O nome antigo **UpNext** foi abandonado (ver `docs/adr/ADR-002-renomeacao-upnext-para-flomo.md`). Repositório: `flomo-labs/flomo`.

Regras para quem for alterar código ou documentos:

- Todo código, texto de UI, README, teste, mensagem de commit e descrição de PR **novos** usam apenas "Flomo".
- A migração é gradual: ao editar um arquivo que ainda contém `UpNext`, `upnext` ou `UPNEXT`, **renomeie as ocorrências daquele arquivo no mesmo PR** para `Flomo`, `flomo` ou `FLOMO`. Não faça PR de renomeação em massa.
- Não presuma que "UpNext" é o nome correto só porque aparece em um arquivo: é resíduo da migração.
- **Mantenha** "Up Next" / "UpNext" apenas em (1) referências ao app concorrente Up Next TV (upnexttv.app) e à discussão de conflito de marca, (2) texto histórico (linha do tempo, ADRs já aceitos; no máximo acrescente "(hoje Flomo)"), (3) histórico do git.
- Se a renomeação tocar algo fora do repositório (variável de ambiente, projeto Vercel/Supabase, redirect do OAuth), registre no PR o que precisa ser atualizado.
- Para listar o que falta: `git grep -n -i "upnext" -- . ":!pnpm-lock.yaml"`.

## Regras de negócio

- Antes de implementar ou mudar uma regra de negócio, consulte `docs/regras-de-negocio.md`.
- Regra nova ou alterada é registrada lá no mesmo PR, **depois da avaliação** descrita no topo do arquivo (o repositório é público: estratégia, valores de proteções e dados de pessoas não entram).

## Camadas e imports (ADR-001)

Regras de dependência entre pastas, impostas pelo ESLint (`eslint.config.mjs`):

- `src/domain/`: TypeScript puro. Não importa `next`, `react`, `drizzle-orm`,
  `@supabase/*`, nem `infra/`, `app/`, `components/` ou `lib/`. Acesso a banco e
  serviços externos entra por interface (porta), implementada em `infra/`.
- `src/contracts/`: só pode importar `zod`, outros arquivos de `contracts/` ou
  caminhos relativos. É uma lista de permitidos.
- `src/infra/` pode importar `domain/`. `src/app/` pode importar `domain/`,
  `infra/` e `contracts/`.

### Ao precisar de uma dependência nova em `contracts/`

1. A regra de `contracts/` bloqueia qualquer import que não seja `zod`. Se o
   lint falhar, não use `eslint-disable` e não mova o código para outra pasta só
   para fugir da regra.
2. Pergunte antes: a dependência roda em Node, navegador e React Native? Se não,
   o código não pertence a `contracts/`.
3. Se for adequada, libere manualmente: acrescente um lookahead
   `(?!nome-do-pacote(/|$))` ao `regex` do bloco de `contracts/` no
   `eslint.config.mjs`, e justifique a inclusão na descrição do PR.
4. Teste que a regra continua barrando o resto: crie um arquivo temporário em
   `src/contracts/` importando outro pacote e confirme que o `pnpm lint` falha.

Para `domain/`, a regra é uma lista de proibidos: bibliotecas puras podem ser
importadas, mas nunca as listadas acima.

## Injeção de SQL

- Consultas só com o template `sql\`...\`` do Drizzle ou o query builder, que mandam os valores à parte do comando.
- O ESLint barra `sql.raw`, `.unsafe()` e `execute()` com texto montado na mão fora de `src/infra/db/schema/` e dos testes. Não use `eslint-disable` para fugir da regra: para nome de tabela ou coluna dinâmico, use `sql.identifier`.

## Componentização da interface

Ao criar ou alterar uma tela, antes de codar, veja se algum elemento (lista, card, botão padrão, diálogo, bloco) já existe em outra tela ou vai existir em mais de uma. Se sim, vira componente; se é de uso único, deixe na própria tela. Não crie abstração "por precaução".

- Reutilize primeiro o que existe: shadcn em `src/components/ui/` ou do projeto em `src/components/`. Crie novo só quando não houver.
- Um componente por arquivo, nome claro, agrupado por domínio quando houver (ex.: `catalog/`). Sem marcação duplicada entre telas.
- Exemplo: a lista de Seguintes é um componente usado na Home e em `/seguintes`.
- No PR, uma linha: o que foi componentizado ou reaproveitado e o que ficou de fora.

## Git e Pull Requests

- Nunca dar push direto na `main`. Toda mudança entra por PR com o CI verde.
- Nomeie a branch como `tipo/descricao-curta` (`feat/`, `fix/`, `chore/`, `docs/`).
- Commits em Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `ci:`, `test:`, com escopo opcional), em português, no imperativo ou descritivo curto.
- **Estratégia de merge: "Create a merge commit"**. Nunca usar squash nem rebase para mesclar PRs. Como os commits da branch vão para a `main`, mantenha-os limpos: um propósito por commit, sem "wip" nem commits duplicados.
- Para atualizar uma branch com a `main`, use `git merge origin/main`, e não rebase, para evitar `force push` em branch com PR aberto. Rebase só em branch local que nunca foi enviada.
- Nunca fazer `git push --force` em branch compartilhada ou na `main`.
- PRs pequenos e focados, usando o template de `.github/pull_request_template.md`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
