## O que muda

<!-- Resumo em 1-3 linhas. Link para a issue: Closes #123 -->

## Por que

<!-- Contexto ou decisão por trás da mudança. Se for decisão grande, linkar o ADR. -->

## Como testar

<!-- Passos para validar localmente. -->

## Checklist

- [ ] PR pequeno e focado em uma coisa
- [ ] Lint, typecheck, testes e build passam
- [ ] Testes de domínio adicionados/atualizados quando há regra nova
- [ ] Entradas da API validadas com Zod; erros no formato `{ error: { code, message } }`
- [ ] Nenhum secret no client (`NEXT_PUBLIC_*` só para valores públicos)
- [ ] TMDB chamado apenas no servidor
- [ ] Migration incremental (sem editar migration já aplicada) e RLS revisada, se houver mudança de schema
- [ ] Sem OFFSET profundo nem cálculo pesado no request path
- [ ] Regra de negócio nova ou alterada avaliada e registrada em `docs/regras-de-negocio.md`, se aplicável
- [ ] `/em-breve` (`src/content/roadmap.ts`) atualizado, se a mudança entrega ou planeja uma funcionalidade
- [ ] Docs/ADR atualizados, se aplicável

## Screenshots (se houver UI)

<!-- Mobile e desktop. -->
