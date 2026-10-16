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
- **Idade:** durante o TCC e o beta fechado, uso só por maiores de 18 anos. Declarada em [`/termos`](../src/app/(publico)/termos/page.tsx) e no aviso da tela [`/entrar`](../src/app/entrar/page.tsx) (sem registro do aceite); ainda não há verificação de idade (ECA Digital antes do lançamento público).

## Avaliações

- **Nota:** de 0,5 a 5 estrelas, em meias estrelas; guardada como inteiro de 1 a 10 (7 = 3,5★). [`src/contracts/rating.ts`](../src/contracts/rating.ts), [`src/domain/rating.ts`](../src/domain/rating.ts), [ADR-001](adr/ADR-001-arquitetura-base.md)
- **Reviews:** um usuário pode escrever várias reviews do mesmo título. _(prevista)_

## Biblioteca

- **Status:** `watchlist`, `watching`, `paused`, `watched`, `dropped`. A interface do MVP mostra Todos, Assistindo, Quero ver e Pausado. [`src/domain/library/values.ts`](../src/domain/library/values.ts), `CHECK` em [`drizzle/0004_library.sql`](../drizzle/0004_library.sql)
- **Estado e histórico separados:** o progresso atual nunca é a fonte da verdade; o histórico de visualizações é. Um título por usuário na biblioteca; um episódio visto uma vez no progresso; o histórico aceita vários registros do mesmo item (rever). [ADR-001](adr/ADR-001-arquitetura-base.md), [`src/infra/db/schema/library.ts`](../src/infra/db/schema/library.ts)
- **Data do "visto" é opcional:** cada registro do histórico tem data e precisão (exata, dia, mês, ano ou sem data) e a origem (marcado na hora, retroativo no app ou import). Sem data se e só se a precisão é "sem data". [`src/infra/db/schema/library.ts`](../src/infra/db/schema/library.ts)
- **Marcar como visto:** por padrão, a data é a da marcação; o usuário pode tirar a data ou informar outra (dia, mês ou ano, nunca no futuro nem antes de 1900) e trocar depois. Só "agora" conta como marcado na hora; o resto é registro retroativo. O padrão de cada situação fica num lugar só e será avaliado com usuários reais. [`src/domain/library/watch-date.ts`](../src/domain/library/watch-date.ts)
- **Marcar de novo** (o botão de marcar) um episódio ou filme já visto não grava nada; para registrar outra vez há "ver de novo", abaixo. [`src/domain/library/mark-watched.ts`](../src/domain/library/mark-watched.ts)
- **Registrar de novo (rever):** um episódio ou filme já visto aceita mais um registro no histórico, por padrão com a data de agora (mesma escolha de data de marcar); o progresso não se repete e o status do título não muda. Item não visto não pode ser revisto. Rever a série inteira, em rodadas, é da Fase 2. [`src/domain/library/mark-watched.ts`](../src/domain/library/mark-watched.ts)
- **Marcar anteriores:** marca, sem data, os episódios anteriores ainda não vistos das temporadas regulares (especiais ficam de fora) que já foram lançados ou estão sem data no catálogo. [`src/domain/library/mark-watched.ts`](../src/domain/library/mark-watched.ts)
- **Status automático:** marcar um episódio põe a série em Assistindo (saindo de Quero ver, Pausado ou Abandonado; Visto continua Visto); marcar um filme o põe em Visto. [`src/domain/library/mark-watched.ts`](../src/domain/library/mark-watched.ts)
- **Série que vira Visto sozinha:** ao marcar o último episódio, uma série encerrada ou cancelada no catálogo, com todos os episódios regulares já lançados vistos (especiais e episódios futuros não contam), passa para Visto. Série em exibição nunca vira Visto sozinha. Marcar um episódio nunca tira uma série de Visto; só desmarcar um episódio a devolve a Assistindo. [`src/domain/library/mark-watched.ts`](../src/domain/library/mark-watched.ts)
- **Biblioteca (tela):** lista só os títulos do próprio usuário, da situação mudada mais recentemente para a mais antiga (marcar um episódio não reordena a lista), com filtros Todos, Assistindo, Quero ver e Pausado (Todos inclui Visto e Abandonado). Nas séries mostra quantos episódios regulares já lançados ele viu; especiais e episódios futuros não contam, e episódio sem data no catálogo conta como lançado. Exige login. [`src/domain/library/list-library.ts`](../src/domain/library/list-library.ts)
- **Desmarcar** é tratado como engano: tira só o registro mais recente do episódio ou filme (na tela, pede confirmação). O item deixa de estar visto quando não sobra nenhum registro; senão continua visto, com a data mais recente entre os registros que ficaram. O status do título só muda se a série estava em Visto: ela volta a Assistindo (ver "Série que vira Visto sozinha"). O usuário vê todos os registros de um item e apaga os que quiser, um a um. [`src/domain/library/mark-watched.ts`](../src/domain/library/mark-watched.ts)
- **Feed e estatísticas:** registro retroativo (sem data, com data informada ou importado) não gera atividade para os amigos; estatísticas por período só usam registros com data. _(prevista: feed na Fase 2.2, estatísticas na 2.5)_
- **Privacidade:** cada usuário só vê e altera a própria biblioteca, o próprio progresso e o próprio histórico; ainda não há biblioteca visível no perfil. Policies em [`src/infra/db/schema/library.ts`](../src/infra/db/schema/library.ts)
- **Catálogo protegido:** o banco recusa apagar título ou episódio que esteja na biblioteca ou no histórico de alguém. [`drizzle/0004_library.sql`](../drizzle/0004_library.sql)

## Moderação e segurança entre usuários _(prevista)_

- Qualquer usuário pode denunciar review, comentário, perfil ou lista, com motivo.
- Moderadores podem ocultar, remover, marcar como spoiler, advertir, suspender e banir; toda ação é registrada com motivo e pode ser contestada uma vez.
- Bloqueio: quem bloqueia e quem é bloqueado deixam de ver o conteúdo um do outro; o bloqueado não segue, não comenta e não menciona.
- Silenciar esconde o conteúdo de alguém só para quem silenciou.
- Há limite de publicações e denúncias por usuário (o valor não é público).
- Papéis de moderador e admin. [ADR-003, seção 8](adr/ADR-003-rls-drizzle-conexoes-e-perfil.md)

## Privacidade e dados

- **Páginas legais:** `/privacidade` e `/termos` descrevem o que o app faz hoje; mudou o tratamento de dados, atualize as páginas e a data no mesmo PR. [`src/app/(publico)/`](../src/app/(publico))
- **Cookies:** só o de sessão (`HttpOnly`, `SameSite=Lax`, `Secure` em produção), estritamente necessário; nenhum cookie de rastreamento, publicidade ou analytics. [ADR-003, seção 5](adr/ADR-003-rls-drizzle-conexoes-e-perfil.md), [`src/infra/auth/supabase/`](../src/infra/auth/supabase/index.ts)
- **Sair:** encerra a sessão só no dispositivo atual.
- **Exclusão de conta:** apaga em cascata os dados do usuário. [ADR-003, seção 9](adr/ADR-003-rls-drizzle-conexoes-e-perfil.md)
- **Retenção legal:** registros de acesso (Marco Civil, 6 meses) e registros de moderação ficam fora da cascata e são apagados ao fim do prazo. [ADR-003, seção 9](adr/ADR-003-rls-drizzle-conexoes-e-perfil.md)

## Catálogo

- Dados de filmes e séries vêm do TMDB, chamado só pelo servidor, com atribuição obrigatória. [`docs/THIRD_PARTY.md`](THIRD_PARTY.md), [`src/infra/catalog/tmdb/`](../src/infra/catalog/tmdb/client.ts)
- **Idioma:** títulos, sinopses e pôsteres em pt-BR; título e idioma originais guardados à parte. Sem tradução, mostra o título original. [`src/domain/catalog/types.ts`](../src/domain/catalog/types.ts), [`src/infra/db/schema/catalog.ts`](../src/infra/db/schema/catalog.ts)
- **Identificação:** todo título tem um id próprio do Flomo; o id do TMDB fica só em `external_ids` (filme e série do TMDB com o mesmo número são títulos diferentes). [`src/infra/db/schema/catalog.ts`](../src/infra/db/schema/catalog.ts)
- **Busca:** filmes e séries, sem conteúdo adulto; pessoas ainda não aparecem. Maiúsculas e espaços extras não mudam a busca. [`src/domain/catalog/search-catalog.ts`](../src/domain/catalog/search-catalog.ts), [`src/infra/catalog/tmdb/provider.ts`](../src/infra/catalog/tmdb/provider.ts)
- **Cache:** o catálogo é guardado no banco com prazo de validade (busca: 1 dia; série em exibição: 1 dia; série encerrada ou filme lançado: 30 dias; filme ainda não lançado: 2 dias). Vencido o prazo, o dado guardado é mostrado e atualizado em segundo plano. Os Termos do TMDB limitam o cache a 6 meses. [`src/domain/catalog/freshness.ts`](../src/domain/catalog/freshness.ts)
- **Onde assistir:** só o Brasil, com dados do JustWatch via TMDB e crédito obrigatório ao JustWatch; guardado por 1 dia. A lista leva à página do título no TMDB, não ao serviço. [`src/domain/catalog/watch-providers.ts`](../src/domain/catalog/watch-providers.ts), [`docs/THIRD_PARTY.md`](THIRD_PARTY.md)
- **Filtro "Novelas" na prateleira por serviço:** séries do TMDB com o gênero Soap ou a palavra-chave "telenovela", só de origem Brasil, México, Argentina, Colômbia, Chile, Peru, Venezuela, Portugal ou Espanha, que estão no serviço escolhido, por popularidade. Novela estrangeira conta como novela. Turquia e outros países ficam de fora até a classificação ser medida; a categoria completa e a correção manual virão na Fase 3. [`src/infra/catalog/tmdb/provider.ts`](../src/infra/catalog/tmdb/provider.ts)
- **Prateleiras da Home pública:** "em alta", "nos cinemas" e "em alta no serviço" (lista fixa de serviços; é a popularidade do TMDB, não o ranking do serviço). Sem conteúdo adulto e sem título sem pôster; guardadas por 6 horas; lista vazia não é guardada. [`src/domain/catalog/list-shelf.ts`](../src/domain/catalog/list-shelf.ts), [`src/contracts/catalog.ts`](../src/contracts/catalog.ts)
- **Episódios:** temporadas e episódios que somem do TMDB continuam no Flomo, porque o progresso dos usuários aponta para eles. [`src/infra/db/catalog-repository.ts`](../src/infra/db/catalog-repository.ts)
- **Acesso:** o catálogo só é gravado pelo servidor; usuários logados podem lê-lo no banco (RLS), e o cache bruto do provedor não é visível a ninguém além do servidor. [`src/infra/db/schema/catalog.ts`](../src/infra/db/schema/catalog.ts)
