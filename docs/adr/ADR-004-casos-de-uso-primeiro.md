# ADR-004: Casos de uso primeiro, API HTTP (`/api/v1`) quando houver consumidor

- **Status:** Aceito
- **Data:** 2026-10-13
- **Decisores:** dupla do projeto Flomo

## Contexto

O ADR-001 e o plano de produto definiam o Flomo como API-first: cada operação do spike nasceria como rota `/api/v1` com schema Zod e cliente HTTP, além da página, para o futuro app mobile (Expo) usar o mesmo contrato.

Para uma dupla com prazo de TCC, isso significa escrever rota, cliente e página para cada operação antes de existir o consumidor da API. O objetivo real, que é o mobile reaproveitar as mesmas regras e contratos, não depende de a API HTTP existir desde o primeiro dia, e sim de a lógica não ficar presa ao Next.js.

## Decisão

- Toda regra de negócio fica em casos de uso em `domain/`, testáveis sem subir o Next.
- Os casos de uso recebem o usuário autenticado como parâmetro. Não leem cookie, cabeçalho nem sessão.
- Entradas e saídas têm contrato Zod em `contracts/`.
- A web chama os casos de uso por Server Components e Server Actions finos, que só resolvem o usuário, validam a entrada e traduzem o resultado.
- As rotas `/api/v1` são camadas igualmente finas sobre os mesmos casos de uso e nascem quando o app Expo começar (ou antes, para uma rota específica que precise existir).
- A autenticação da borda aceita cookie (web) e token `Authorization: Bearer` (mobile) desde o PR de login, para a API do mobile não exigir mudança no fluxo de sessão (ver ADR-003).
- Erros seguem o formato `{ error: { code, message } }` nas duas bordas.

O anti-padrão deixa de ser "lógica só em Server Actions sem espelho HTTP" e passa a ser **"lógica de negócio em Server Action ou route handler"**.

## Alternativas consideradas

| Alternativa | Motivo de não adotar |
| ----------- | -------------------- |
| `/api/v1` completo desde o spike | Retrabalho (rota, cliente e página por operação) antes de existir consumidor, num prazo curto |
| Só Server Actions, sem camada de casos de uso | Prende a lógica ao Next.js e obriga a reescrever tudo para o mobile |

## Consequências

**Positivas**

- Menos código no spike sem perder o caminho para o mobile.
- Casos de uso testáveis em isolamento, como o ADR-001 já pedia.
- Gerar OpenAPI a partir dos schemas Zod fica para quando houver consumidor externo.

**Negativas e riscos**

- A disciplina de não colocar regra em Server Action depende de revisão de PR.
- Quando o Expo começar, será preciso criar as rotas de uma vez (camada fina, mas trabalho concentrado).

## Gatilhos para revisar esta decisão

- Início do app Expo.
- Qualquer consumidor externo da API (integração, parceiro).

## Referências

- ADR-001 (camadas e regra de dependência)
- ADR-003 (autenticação por cookie e Bearer, usuário como parâmetro)
