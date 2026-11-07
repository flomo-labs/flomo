# Versionamento e changelog

Fonte única da versão: o campo `version` do `package.json`. App, tag, release e changelog derivam dele. O número usa [SemVer](https://semver.org/lang/pt-BR/) `X.Y.Z` puro; "beta" é só um rótulo na interface ("Flomo 0.9.0 beta"), nunca sufixo do número. O `1.0.0` fica reservado para a primeira versão pública.

## O que incrementa cada número

| Número | Sobe quando | Exemplos |
|---|---|---|
| MAJOR (X) | Quebra o que o usuário ou a integração já usa, ou marco de produto (lançamento público). Só depois do 1.0.0. | Remover uma área do app; mudar o formato de dados exportados |
| MINOR (Y) | Funcionalidade nova compatível, ou mudança relevante de comportamento ou visual. No pré-1.0, também a quebra de compatibilidade. | Recuperar senha; tema claro; importação do TV Time |
| PATCH (Z) | Correção sem funcionalidade nova: bug, texto, acessibilidade, desempenho. | Corrigir cursor de mão em abas |

- Ao subir um número, os da direita voltam a zero (`0.9.3` → `0.10.0`). Os números são inteiros: `0.10.0` vem depois de `0.9.0`.
- Documentação, CI, testes, refatoração e dependências não geram versão por si; entram na próxima que sair.
- Uma migration isolada não define o número: vale o impacto para o usuário.

## Changelog (`CHANGELOG.md`)

Formato [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), em português do Brasil, com acentuação.

1. **Quem:** o autor do PR escreve a entrada no mesmo PR, em `## [Não lançado]`. PR que muda algo visível ao usuário, ou que exige ação de quem desenvolve, não está pronto sem ela.
2. **Seções** (só as com itens, nesta ordem): Adicionado, Alterado, Corrigido, Removido, Segurança. Em Segurança, sem detalhar a vulnerabilidade antes de corrigida e implantada (o repositório é público).
3. **Uma linha por mudança**, frase curta, terminando com o PR entre parênteses: `(#123)`. A issue fica ligada ao PR (`Closes #N`).
4. **Linguagem do usuário:** diga o que mudou para quem usa, não como foi feito.
5. **Entra:** o que o usuário percebe e o que exige ação de quem desenvolve ou hospeda (variável de ambiente nova, migration com cuidado, mudança de URL de login), com prefixo **"Para quem desenvolve:"**.
6. **Não entra:** refatoração, testes, CI, dependências sem efeito visível, ajuste de documentação. Se o PR só tem isso, escrever "sem mudança no changelog" na descrição.
7. **Quebra de compatibilidade:** item começa com **"Atenção:"** e explica o que fazer.
8. Sem segredos, e-mails pessoais, caminhos locais, estratégia ou valores de proteção; sem o nome antigo do produto.
9. Cada versão tem link de comparação no rodapé (`compare/vA...vB`).

## Como fazer uma release

Por release, não por PR: os PRs só alimentam "Não lançado". A release é um PR próprio (`chore: release X.Y.Z`), mesclado como os demais (merge commit), que:

1. sobe `version` no `package.json`;
2. renomeia `[Não lançado]` para `[X.Y.Z] - AAAA-MM-DD`, abre um novo `[Não lançado]` vazio e atualiza os links do rodapé.

Depois do merge, cria-se a tag anotada `vX.Y.Z` sobre o merge commit na `main` e o GitHub Release com o trecho do changelog como notas. Quem decide a release é a dupla de desenvolvimento.

## Hotfix

Branch `fix/curto-nome` a partir da `main`, PR normal, entrada em "Corrigido", release com PATCH (`0.9.0` → `0.9.1`) logo em seguida. Não há branch de manutenção: só existe uma versão em produção.

## Onde a versão aparece

- Rodapé de Configurações: "Flomo X.Y.Z beta", lida de `NEXT_PUBLIC_APP_VERSION`, definida em `next.config.ts` a partir do `package.json`. Não preencher a variável à mão.
- O diálogo "O que há de novo" (#230) lê essa mesma versão; o changelog é o registro completo e o diálogo mostra o resumo ao usuário.
- `/em-breve` (`src/content/roadmap.ts`) é o que vem; o changelog é o que saiu. Ao entregar um item do roadmap, remova-o de lá e registre no changelog, no mesmo PR.
