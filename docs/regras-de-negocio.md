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
- **Quem vê perfis:** só quem entrou na conta. Visitante sem login não vê perfil nenhum, nem público (decisão de 2026-10-18; pode ser revista). Policies em [`src/infra/db/schema/profiles.ts`](../src/infra/db/schema/profiles.ts)
- **Nome de exibição e bio:** nome até 50 caracteres e bio até 160, contando caracteres (acento e emoji valem um); nenhum dos dois pode ser vazio ou só espaços (vazio = sem nome ou sem bio). No cadastro, o nome que vem do Google é cortado em 50 caracteres. `CHECK` e trigger em [`drizzle/0016_perfil_bio_e_estatisticas.sql`](../drizzle/0016_perfil_bio_e_estatisticas.sql)
- **Números do perfil:** séries com pelo menos um episódio visto, filmes vistos, episódios vistos, horas assistidas e notas dadas. Rever um episódio ou filme não conta de novo; as horas somam a duração de cada episódio e filme visto (episódio sem duração usa a da série; sem nenhuma, conta zero). Mostram só totais, nunca quais títulos nem quais notas, e seguem a visibilidade do perfil: perfil privado só o dono vê. Função `app.profile_stats` em [`drizzle/0016_perfil_bio_e_estatisticas.sql`](../drizzle/0016_perfil_bio_e_estatisticas.sql)
