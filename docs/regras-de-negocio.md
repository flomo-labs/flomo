# Regras de negócio

Fonte comum das regras de negócio e definições do Flomo, para devs e agentes. Cada regra diz **o que vale** e **onde é garantida** (ADR, schema em `contracts/`, constraint do banco ou teste). O código é a garantia; este arquivo é o índice legível.

## Antes de acrescentar uma regra: avaliação obrigatória

O repositório é público e o histórico do git não se apaga. Antes de escrever uma regra aqui, responda:

1. **Ela já aparece no comportamento do app ou no código?** Se sim, pode entrar.
2. **Ela revela dinheiro ou estratégia?** Preços, planos, metas, parceiros, negociações, lançamentos ainda não anunciados. Se sim, **não entra**: fica no plano de produto privado.
3. **Ela ajuda alguém a burlar uma proteção?** Valores exatos de limites anti-spam, sinais de detecção de fraude ou contas falsas, critérios internos de prioridade da moderação. Se sim, aqui entra só que a proteção existe; o valor fica em variável de ambiente ou no banco.
4. **Ela contém dados de pessoas?** Nomes de moderadores, casos reais, e-mails. Se sim, **não entra**.

Na dúvida, não entra: registre no plano privado e decida com a dupla. Quem revisa o PR confere essa avaliação (há um item no checklist do template de PR).

## Como manter

- Regra nova ou alterada entra **no mesmo PR** que muda o código.
- Uma linha por regra, com o link para onde ela é garantida. Detalhe e justificativa ficam no ADR.
- Regra que ainda não tem código fica marcada como _(prevista)_.

## Perfil e identidade

- **Handle:** 5 a 20 caracteres; letras minúsculas, números, `_` e `.`; começa e termina com letra ou número; sem dois separadores seguidos. Maiúsculas digitadas viram minúsculas. [ADR-003, seção 6](adr/ADR-003-rls-drizzle-conexoes-e-perfil.md), [`src/contracts/profile.ts`](../src/contracts/profile.ts), `CHECK` em [`drizzle/0001_profiles.sql`](../drizzle/0001_profiles.sql). A regra está nos dois lugares: mudar um exige mudar o outro (no banco, por uma migration nova).
- **Unicidade do handle:** ignora `.` e `_` (`renato.silva`, `renato_silva` e `renatosilva` são o mesmo para fins de unicidade). O dono pode trocar entre as variações do próprio handle. [ADR-003, seção 6](adr/ADR-003-rls-drizzle-conexoes-e-perfil.md), índice único em [`drizzle/0001_profiles.sql`](../drizzle/0001_profiles.sql)
- **Nomes reservados:** handles como `admin`, `login` e `embreve` (comparados sem `.` e `_`) não podem ser escolhidos, nem handles com o prefixo `u_` ou que, sem os separadores, fiquem iguais a um handle provisório. [`src/contracts/profile.ts`](../src/contracts/profile.ts)
- **Login:** só com conta Google, por enquanto. [ADR-003, seção 5](adr/ADR-003-rls-drizzle-conexoes-e-perfil.md), [`src/infra/auth/supabase/`](../src/infra/auth/supabase/index.ts)
- **Handle provisório:** todo usuário nasce com `u_` + 12 caracteres e escolhe o definitivo no primeiro acesso (tela `/cadastro`, logo depois do primeiro login). [ADR-003, seção 7](adr/ADR-003-rls-drizzle-conexoes-e-perfil.md), trigger em [`drizzle/0002_profiles_triggers.sql`](../drizzle/0002_profiles_triggers.sql)
- **Troca de handle:** permitida a qualquer momento, se o novo estiver livre. O antigo fica livre na hora; links antigos param de funcionar. [ADR-003, seção 6](adr/ADR-003-rls-drizzle-conexoes-e-perfil.md), caso de uso em [`src/domain/profile/change-handle.ts`](../src/domain/profile/change-handle.ts)
- **Padrões do perfil:** país `BR`, fuso `America/Sao_Paulo`, idioma `pt-BR`, perfil público. [ADR-003, seção 6](adr/ADR-003-rls-drizzle-conexoes-e-perfil.md)
- **Visibilidade:** perfil privado só é visto pelo dono. [ADR-003, seção 6](adr/ADR-003-rls-drizzle-conexoes-e-perfil.md), policies em [`src/infra/db/schema/profiles.ts`](../src/infra/db/schema/profiles.ts)
- **Idade:** durante o TCC e o beta fechado, uso só por maiores de 18 anos. _(prevista: termos de uso)_

## Avaliações

- **Nota:** de 0,5 a 5 estrelas, em meias estrelas; guardada como inteiro de 1 a 10 (7 = 3,5★). [`src/contracts/rating.ts`](../src/contracts/rating.ts), [`src/domain/rating.ts`](../src/domain/rating.ts), [ADR-001](adr/ADR-001-arquitetura-base.md)
- **Reviews:** um usuário pode escrever várias reviews do mesmo título. _(prevista)_

## Biblioteca

- **Status:** `watchlist`, `watching`, `paused`, `watched`, `dropped`. A interface do MVP mostra Todos, Assistindo, Quero ver e Pausado. _(prevista)_
- **Estado e histórico separados:** o progresso atual nunca é a fonte da verdade; o histórico de visualizações é. [ADR-001](adr/ADR-001-arquitetura-base.md)

## Moderação e segurança entre usuários _(prevista)_

- Qualquer usuário pode denunciar review, comentário, perfil ou lista, com motivo.
- Moderadores podem ocultar, remover, marcar como spoiler, advertir, suspender e banir; toda ação é registrada com motivo e pode ser contestada uma vez.
- Bloqueio: quem bloqueia e quem é bloqueado deixam de ver o conteúdo um do outro; o bloqueado não segue, não comenta e não menciona.
- Silenciar esconde o conteúdo de alguém só para quem silenciou.
- Há limite de publicações e denúncias por usuário (o valor não é público).
- Papéis de moderador e admin. [ADR-003, seção 8](adr/ADR-003-rls-drizzle-conexoes-e-perfil.md)

## Privacidade e dados

- **Cookies:** só o de sessão (`HttpOnly`, `SameSite=Lax`, `Secure` em produção), estritamente necessário; nenhum cookie de rastreamento, publicidade ou analytics. [ADR-003, seção 5](adr/ADR-003-rls-drizzle-conexoes-e-perfil.md), [`src/infra/auth/supabase/`](../src/infra/auth/supabase/index.ts)
- **Sair:** encerra a sessão só no dispositivo atual.
- **Exclusão de conta:** apaga em cascata os dados do usuário. [ADR-003, seção 9](adr/ADR-003-rls-drizzle-conexoes-e-perfil.md)
- **Retenção legal:** registros de acesso (Marco Civil, 6 meses) e registros de moderação ficam fora da cascata e são apagados ao fim do prazo. [ADR-003, seção 9](adr/ADR-003-rls-drizzle-conexoes-e-perfil.md)

## Catálogo

- Dados de filmes e séries vêm do TMDB, chamado só pelo servidor, com atribuição obrigatória. [`docs/THIRD_PARTY.md`](THIRD_PARTY.md)
- Títulos exibidos em pt-BR, com título e idioma originais guardados. _(prevista)_
