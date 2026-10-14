# ADR-003: RLS com Drizzle, conexões com o banco, chaves do Supabase e criação de perfil

- **Status:** Aceito
- **Data:** 2026-10-13
- **Decisores:** dupla do projeto Flomo

## Contexto

O ADR-001 exige RLS em todas as tabelas, testada com usuário autenticado, anônimo e admin. Mas o Drizzle conecta ao Postgres com o papel `postgres`, que ignora RLS: sem uma decisão, toda query do servidor passaria por cima das policies, e um filtro esquecido num caso de uso viraria vazamento de dados entre usuários.

O PR 2 cria a conexão com o banco, a tabela `profiles` e as primeiras policies. A forma de conectar e de escrever as policies depende desta decisão, por isso ela vem antes do PR 2, e não no PR 3 como previa o plano original.

Também era preciso fechar, antes de existir o projeto no Supabase: quais chaves usar (as chaves `anon` e `service_role` estão sendo descontinuadas pelo Supabase até o fim de 2026), qual driver e quais URLs de conexão, a versão do Drizzle, como o perfil nasce e o que acontece quando uma conta é apagada.

## Decisão

### 1. Dados de usuário passam pelo RLS

- Um helper em `infra/db/` (`withUser`) abre uma transação, grava as claims do JWT do usuário na sessão (`set_config('request.jwt.claims', …, true)`) e executa `set local role authenticated`. As queries de dados de usuário rodam dentro dessa transação, e o Postgres aplica as policies.
- O cliente sem `withUser` (papel `postgres`, ignora RLS) fica restrito ao catálogo (dados públicos do TMDB), aos jobs e a tarefas administrativas. Repositórios de dados de usuário recebem a transação do `withUser`, nunca o cliente direto.
- Os casos de uso continuam conferindo o dono do dado (dupla checagem). O banco é a segunda barreira, não a única.
- **Plano B:** se o helper travar o cronograma, cai-se para autorização só na aplicação, sem perder trabalho: as policies continuam declaradas e testáveis pelo cliente Supabase.

### 2. Policies usam `app.current_user_id()`

As policies não chamam `auth.uid()` direto. Uma migration cria o schema `app` e a função:

```sql
create schema if not exists app;

create or replace function app.current_user_id()
returns uuid
language sql
stable
as $$ select auth.uid() $$;
```

Nas policies, sempre na forma `(select app.current_user_id())`, para o Postgres avaliar uma vez por query. Só essa função sabe de onde vem o usuário; trocar o provedor de autenticação muda a função, não as policies (ver `docs/troca-de-ferramentas.md`). Como o Drizzle não modela funções, ela entra numa migration SQL escrita à mão (`drizzle-kit generate --custom`).

### 3. Conexões: postgres.js com duas URLs

- Driver `postgres` (postgres.js).
- `DATABASE_URL`: pooler do Supabase em modo transação, usado pelo app, com `prepare: false` (o modo transação não aceita prepared statements).
- `DATABASE_URL_MIGRATIONS`: pooler em modo sessão, usado só pelo `drizzle-kit`. Funciona em redes sem IPv6.
- `set local role` e `set_config(…, true)` valem só dentro da transação, por isso são seguros no pooler em modo transação.

### 4. Versões

`drizzle-orm` ~0.45 e `drizzle-kit` ~0.31 (linha estável). A migração para a 1.0 fica para depois de sair a versão estável, com `drizzle-kit up` para converter a pasta de migrations.

### 5. Chaves do Supabase e sessão

- Variáveis `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`) e `SUPABASE_SECRET_KEY` (`sb_secret_…`), no lugar de `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`. O `.env.example` muda no PR 2.
- Chaves de assinatura JWT assimétricas ativadas no projeto.
- O servidor identifica o usuário com `auth.getClaims()`, que valida o JWT, e nunca com `getSession()`, que só lê o cookie.
- A borda (`app/`) aceita sessão por cookie (web) e por token `Authorization: Bearer` (futuro app mobile). Os casos de uso recebem o usuário como parâmetro e não leem cookie nem cabeçalho (ver ADR-004).
- **Cookies só os estritamente necessários.** Na web, o token de sessão fica num cookie `HttpOnly`, `Secure` e `SameSite=Lax`, porque é o único lugar onde o servidor consegue lê-lo na renderização e onde um script malicioso na página não consegue roubá-lo (guardar o token em `localStorage` o deixaria exposto a XSS). Não há cookies de rastreamento, publicidade ou analytics; métricas de produto, quando existirem, são sem cookies. Com isso, a LGPD não exige banner de consentimento para cookies; a política de privacidade lista o cookie de sessão.

### 6. Tabela `profiles`

- Colunas: `id` (uuid, PK, FK para `auth.users.id` com `on delete cascade`), `handle`, `display_name`, `bio`, `avatar_url`, `is_private` (padrão `false`), `locale` (padrão `pt-BR`), `country` (padrão `BR`), `timezone` (padrão `America/Sao_Paulo`), `created_at` e `updated_at` (`timestamptz`; `updated_at` mantido por trigger).
- Flags de privacidade de estatísticas e de "match" ficam para quando essas telas existirem: coluna sem uso é migration e teste a mais.
- **Regra do `handle`:**
  - 5 a 20 caracteres: letras minúsculas, números, `_` e `.`;
  - começa e termina com letra ou número (`@renato.` no fim de uma frase não vira handle);
  - sem dois separadores seguidos (`renato..silva`, `renato._silva`);
  - único ignorando os separadores: se `renato.silva` existe, outra pessoa não pode criar `renato_silva` nem `renatosilva`. O dono pode trocar entre essas variações do próprio handle.
  - No banco: `CHECK (char_length(handle) between 5 and 20 and handle ~ '^[a-z0-9]+([._][a-z0-9]+)*$')` e índice único em `replace(replace(handle, '.', ''), '_', '')`. Em `contracts/`, o mesmo formato mais a lista de nomes reservados (`api`, `admin`, `login`, `em-breve`…) e a proibição do prefixo `u_` em handles escolhidos pelo usuário.
- **Troca de `handle`:** o usuário pode trocar quando quiser. O caso de uso confere a disponibilidade (pela forma sem separadores, desconsiderando o próprio perfil) antes de salvar, e o índice único garante a regra mesmo com dois pedidos simultâneos. O handle antigo fica livre na hora, e links para ele param de funcionar (sem redirecionamento no MVP).
- Policies (papel `authenticated`): `select` de perfil não privado ou do próprio usuário; `update` só do próprio perfil (`using` e `with check`). Sem policy de `insert` nem de `delete`: o perfil nasce pelo trigger e morre em cascata.
- Leitura de perfil público por visitante sem login (papel `anon`) fica para o PR da página de perfil.

### 7. Criação do perfil por trigger

Um trigger `after insert on auth.users` (função `security definer`, com `search_path` vazio) cria o perfil na mesma transação do cadastro, com `handle` provisório (`u_` seguido de 12 caracteres derivados do id do usuário) e `display_name` e `avatar_url` vindos dos metadados do Google, quando existirem. No primeiro acesso, uma tela pede o `handle` definitivo; a validação dessa escolha é caso de uso em `domain/`.

O trigger faz o mínimo e fica numa migration SQL escrita à mão, comentada como específica do Supabase. Ele tem teste de integração, porque um erro nele impede o cadastro.

### 8. Papéis de moderação

Moderadores e administradores são registrados numa tabela `user_roles` (usuário e papel), e não no JWT, para que um papel possa ser retirado na hora. Uma função `app.current_user_has_role(role)`, ao lado de `app.current_user_id()`, permite às policies liberar ações de moderação (ocultar conteúdo, ver denúncias) só para esses papéis. As tabelas de moderação nascem no PR que as usa.

### 9. Exclusão de conta

Regra geral: dados do usuário são apagados em cascata. `profiles` referencia `auth.users` com `on delete cascade`, e as tabelas de usuário (biblioteca, progresso, avaliações, reviews, comentários) referenciam `profiles.id` também com `on delete cascade`. Apagar o usuário no Supabase Auth apaga tudo dele. É mais simples de cumprir na LGPD do que anonimizar. Cada tabela nova declara o `on delete` explicitamente, como o ADR-001 já pede.

Exceções, por obrigação legal, ficam fora da cascata e com prazo de retenção definido: os registros de acesso exigidos pelo Marco Civil da Internet (art. 15: IP, data e hora, por 6 meses, entregues só com ordem judicial) e os registros de moderação ligados a denúncias. Elas guardam o id do usuário sem FK e são apagadas por job (`pg_cron`) ao fim do prazo.

### 10. Ambientes e testes

- Desenvolvimento num projeto Supabase Free separado (`flomo-dev`), de preferência um por dev; produção num projeto próprio, criado no deploy.
- Testes de integração com Vitest contra o banco de dev cobrem as policies como `anon`, `authenticated` (dono e não dono) e admin, além do trigger de perfil.

## Alternativas consideradas

| Alternativa | Motivo de não adotar |
| ----------- | -------------------- |
| Autorização só na aplicação | Um filtro esquecido vira vazamento, e as policies viram enfeite que não dá para testar. Fica como plano B |
| Cliente Supabase (`supabase-js`) para dados de usuário e Drizzle só para catálogo | Duas formas de acessar o banco no mesmo projeto, sem os tipos e as transações do Drizzle justamente nos casos de uso mais delicados |
| Policies com `auth.uid()` direto | Espalha o acoplamento ao Supabase Auth por todas as policies |
| Uma única URL de conexão | Em produção, ou as migrations falham (modo transação) ou o app esgota as conexões (modo sessão), e o erro só aparece no deploy |
| Criar o perfil no callback do OAuth | Se o callback falhar depois de criar o usuário, sobra usuário sem perfil, e cada novo caminho de login (e-mail, mobile) precisa lembrar de chamar |
| Drizzle 1.0 RC | Release candidate parada há meses; risco de bug de ferramenta perto da banca |
| Chaves `anon`/`service_role` | Descontinuadas até o fim de 2026, e trocar uma delas exige trocar o segredo JWT e derruba todas as sessões |

## Consequências

**Positivas**

- O banco barra acesso indevido mesmo com bug no caso de uso.
- O mesmo caminho serve à web (cookie) e ao app mobile (token Bearer).
- Trocar o provedor de autenticação muda uma função SQL, não as policies.
- Todo usuário tem perfil, qualquer que seja a forma de login.

**Negativas e riscos**

- Toda operação de usuário roda numa transação (custo desprezível no volume esperado).
- Policy errada aparece como "resultado vazio", o que confunde ao depurar. Mitigação: testes de integração por papel.
- O trigger e a função `app.current_user_id()` ficam em SQL fora do Drizzle e precisam de migration à mão.
- O cliente sem RLS continua existindo; mantê-lo fora dos repositórios de usuário depende de revisão (e, se preciso, de regra de lint).

## Gatilhos para revisar esta decisão

- Troca do provedor de autenticação.
- Lançamento da Drizzle 1.0 estável.
- Gargalo medido por causa da transação por operação.

## Referências

- ADR-001 (camadas, convenções de dados e RLS desde a primeira tabela)
- ADR-004 (casos de uso primeiro, API HTTP sob demanda)
- `docs/troca-de-ferramentas.md`
- Drizzle, RLS: https://orm.drizzle.team/docs/rls
- Supabase, chaves de API: https://supabase.com/docs/guides/api/api-keys
