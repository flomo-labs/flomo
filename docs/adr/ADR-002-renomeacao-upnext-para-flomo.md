# ADR-002: Renomeação do produto de UpNext para Flomo

- **Status:** Aceito
- **Data:** 2026-10-12
- **Decisores:** dupla de desenvolvimento

## Contexto

O produto foi concebido com o nome **UpNext**. Esse nome conflita com o app iOS independente Up Next TV (upnexttv.app), conflito já apontado na arquitetura v1.5 e no addendum v1.6. A organização no GitHub passou a se chamar `flomo-labs` e o repositório foi renomeado para `flomo-labs/flomo`.

## Decisão

O produto inteiro se chama **Flomo**. O nome **UpNext não deve mais ser usado** em código novo, textos de interface, documentação nova, nomes de pacote, variáveis de ambiente, identificadores de infraestrutura ou mensagens de commit e PR.

## Estratégia de migração: gradual

Não haverá PR de renomeação em massa. Quem alterar um arquivo que ainda contém "UpNext" (em qualquer capitalização) **renomeia as ocorrências naquele arquivo no mesmo PR**, desde que não sejam uma das exceções abaixo.

Regras:

1. Código, textos de UI, metadata, README, testes e documentação **novos** usam apenas Flomo.
2. Ao editar um arquivo existente, troque `UpNext`/`upnext`/`UPNEXT` por `Flomo`/`flomo`/`FLOMO` no arquivo inteiro.
3. Se a troca em um arquivo mexer em algo que afeta ambiente (variável de ambiente, nome de projeto Vercel/Supabase, redirect do OAuth, chave de storage), registre no PR o que precisa ser atualizado fora do repositório.
4. Mencione a renomeação no corpo do PR em uma linha ("renomeia UpNext → Flomo nos arquivos tocados").

## Exceções (manter "UpNext" / "Up Next")

- Referências ao app concorrente **Up Next TV** (upnexttv.app) e à discussão de conflito de marca.
- Texto histórico que descreve o passado do projeto (linha do tempo, ADR-001 e outros ADRs aceitos), acrescentando no máximo uma nota "(hoje Flomo)" na primeira ocorrência.
- Histórico do git.

## Como localizar o que falta

```bash
git grep -n -i "upnext" -- . ":!pnpm-lock.yaml"
```

Ocorrências que aparecerem fora das exceções acima são dívida de renomeação.

## Consequências

- Durante a migração, o repositório terá os dois nomes. Isso é esperado e temporário.
- Agentes de IA e pessoas não devem presumir que "UpNext" ainda é o nome correto só porque o encontraram em um arquivo.
- Quando `git grep` não retornar nada fora das exceções, esta migração está concluída e este ADR pode ganhar o status "Concluído".
