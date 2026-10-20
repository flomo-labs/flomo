# Deploy do Flomo (Vercel + Supabase + Google)

Guia para colocar o Flomo no ar do zero, ou para refazer o ambiente se algo for perdido. Foi escrito a partir do primeiro deploy real (Fase 0.5), incluindo os erros que apareceram. Quase tudo é feito à mão, em painéis de terceiros, então cada passo diz **onde clicar**, **o que preencher** e **por que**.

> Os nomes de menus mudam de vez em quando. Se algo não estiver onde o guia diz, procure pelo nome do campo.
>
> **Nada aqui é segredo, e nada que seja segredo vai para este repositório (ele é público).** Chaves, senhas e URLs de banco são digitadas só nos painéis ou no seu terminal, nunca em arquivos versionados, issues, PRs ou chats.

## Visão geral

O Flomo usa três serviços:

| Serviço          | Para quê                                            |
| ---------------- | --------------------------------------------------- |
| **Supabase**     | Banco Postgres e autenticação (login com Google).   |
| **Vercel**       | Hospeda o app Next.js.                              |
| **Google Cloud** | Cliente OAuth: é o que permite "Entrar com Google". |

Há dois ambientes de dados, separados de propósito:

| Ambiente                       | App               | Banco e login                              |
| ------------------------------ | ----------------- | ------------------------------------------ |
| **Local**                      | `pnpm dev`        | `flomo-dev`                                |
| **Preview** (um por PR/branch) | Vercel Preview    | `flomo-dev`                                |
| **Produção** (branch `main`)   | Vercel Production | `flomo-prod`, com a **Data API desligada** |

Os previews usam o `flomo-dev` para que testar um PR nunca toque nos dados reais. As funções da Vercel rodam em `gru1` (São Paulo, definido em `vercel.json`), a mesma região do Supabase, para que cada consulta ao banco não atravesse o continente.

### Ordem dos passos

1. **A.** Supabase de produção (`flomo-prod`)
2. **B.** Vercel
3. **C.** Google (cliente OAuth de produção)
4. **D.** Supabase (login e URLs) e teste
5. **E.** Publicar o app OAuth do Google

A ordem importa: a B precisa dos valores da A; a C precisa da URL da B e do ref da A; a D precisa dos valores da C.

### Antes de começar

- Contas em supabase.com, vercel.com e console.cloud.google.com, e acesso de administrador ao repositório no GitHub.
- Um gerenciador de senhas aberto: vários valores aparecem uma vez só.
- O repositório clonado no seu computador, com `pnpm install` feito e a `main` atualizada (`git switch main` e `git pull`).
- O projeto de **desenvolvimento** (`flomo-dev`) já criado. Ver `.env.example` e o README para o `.env.local`.

---

## A. Supabase de produção (`flomo-prod`)

**Objetivo:** um banco novo, separado do de desenvolvimento, com as tabelas criadas e a Data API desligada.

### A.1 Criar o projeto

1. Em supabase.com/dashboard, clique em **New project**, na mesma organização do `flomo-dev`.
2. Preencha:
   - **Name:** `flomo-prod`.
   - **Database password:** use o botão de gerar e **guarde no gerenciador de senhas agora**. O Supabase não mostra a senha de novo (dá para redefinir depois, mas é trabalho).
   - **Region:** `South America (São Paulo)`.
3. Clique em **Create new project** e espere alguns minutos até o projeto ficar ativo.

### A.2 Desligar a Data API

**Por quê:** o Supabase publica as tabelas do schema `public` numa API REST (a Data API). Com ela ligada, qualquer usuário logado poderia alterar o próprio perfil direto por ela, usando a chave pública, sem passar pelas regras do app (por exemplo, a validação de nomes de usuário reservados). O Flomo acessa o banco só pelo Drizzle (ADR-003 e ADR-004), então a Data API não é necessária.

Em **Project Settings > Data API** (ou **Integrations > Data API**), desative a API. Se a tela só oferecer escolher os schemas expostos, desmarque `public`. Depois, confira que ficou desligada.

### A.3 Anotar os valores

Anote em local seguro. Você vai usá-los na parte B.

- Em **Project Settings > API Keys**:
  - **Project URL** (`https://<ref>.supabase.co`). O trecho `<ref>` é o **ref do projeto**; ele não é segredo, e você o usará na parte C.
  - Chave **publishable** (`sb_publishable_...`).
  - Em **Secret keys**, a chave **secret** (`sb_secret_...`). Se não houver, crie com **New secret key**. Ela ignora as regras de acesso do banco: nunca vai para o navegador nem para o repositório.
- No botão **Connect** (topo do projeto), seção **Pooler** (ORMs/Connection string). Existem dois modos, e o app usa cada um para uma coisa:

  | Modo                   | Porta | Usado em                                               |
  | ---------------------- | ----- | ------------------------------------------------------ |
  | **Transaction pooler** | 6543  | `DATABASE_URL`: o app, em produção.                    |
  | **Session pooler**     | 5432  | `DATABASE_URL_MIGRATIONS`: só para aplicar migrations. |

  Nas duas URLs, troque `[YOUR-PASSWORD]` pela senha do passo A.1. Se a senha tiver caracteres especiais (`@`, `#`, `/`, `:`), use a versão **codificada** que o painel mostra.

> **Atenção ao usuário da URL.** No pooler, o usuário é **`postgres.<ref>`** (com o ref do projeto). Só `postgres` (conexão direta) não funciona no pooler e dá o erro `password authentication failed for user "postgres"`.

> **Usuário do app.** A `DATABASE_URL` usa o usuário **`flomo_app`**, criado pela migration 0019: ele não é dono das tabelas, não ignora o RLS e, sozinho, só alcança o catálogo (dados de usuário só pelas policies, como o usuário logado). A `DATABASE_URL_MIGRATIONS` continua com `postgres`. Só depois do passo A.4 (o usuário nasce na migration), no **SQL Editor** do projeto, rode `alter role flomo_app with password '<senha forte>';` e monte a `DATABASE_URL` com a URL do Transaction pooler trocando o usuário por **`flomo_app.<ref>`** e a senha por essa nova. O SQL Editor guarda o histórico de consultas: apague a consulta com a senha depois de rodar. Logo depois de trocar a `DATABASE_URL`, abra `/cadastro` e uma página de título para conferir a conexão.

### A.4 Aplicar as migrations

As migrations (pasta `drizzle/`) criam as tabelas, as políticas de acesso (RLS) e os gatilhos. No `flomo-prod`, quem aplica é o GitHub Actions (`.github/workflows/migrations-prod.yml`): a cada merge na `main` que muda a pasta `drizzle/`, o workflow **Migrations (produção)** roda `pnpm db:migrate` sozinho, sem pedir aprovação (decisão de 2026-10-16; ver A.4.2). A URL do banco fica só como segredo no GitHub e não passa pelo seu computador. O GitHub esconde o valor do segredo nos logs, mas não pedaços dele que apareçam numa mensagem de erro: se um job falhar, leia o log antes de compartilhá-lo.

#### A.4.1 Configurar uma vez

No GitHub, em **flomo-labs/flomo > Settings > Environments > New environment**:

1. Nome: `supabase-prod` (exatamente assim; não use `Production`, que a Vercel já usa para os deploys).
2. **Required reviewers:** deixe **desmarcado** para a migration rodar sozinha depois do merge. Para exigir um clique de aprovação (recomendado antes de ligar ads e assinaturas), marque e adicione você (e o Victor), com **Prevent self-review** desmarcado.
3. **Deployment branches and tags:** escolha **Selected branches and tags** e adicione a regra `main`. Assim, só a `main` consegue usar o segredo. Com "Required reviewers" desmarcado, essa regra é a única proteção do segredo: mantenha-a sempre.
4. **Environment secrets > Add environment secret:** nome `DATABASE_URL_MIGRATIONS`, valor a URL do **Session pooler** do `flomo-prod` (A.3, porta 5432, usuário `postgres.<ref>`). Cole direto no campo do GitHub, sem passar por outro lugar.
5. **Environment variables > Add environment variable:** nome `FLOMO_PROD_DB_REF`, valor o ref do `flomo-prod` (não é segredo). O workflow confere que a URL do segredo é a do Session pooler desse projeto (usuário `postgres.<ref>`, porta 5432) e recusa rodar se não for.

#### A.4.2 A cada migration

1. Confira que o CI do PR está verde **antes** do merge: sem a trava de aprovação, a migration roda logo depois do merge e não espera o CI da `main`. Faça o merge do PR com a migration.
2. O workflow **Migrations (produção)** (aba **Actions**) começa sozinho. Se a trava de aprovação estiver ligada (A.4.1), ele aparece como **Waiting**: clique nele, em **Review deployments**, marque `supabase-prod` e **Approve and deploy**.
3. O job termina verde quando as migrations foram aplicadas; o log do passo **Aplicar migrations no flomo-prod** mostra o que rodou. Se falhar, o `drizzle-kit` desfaz as migrations pendentes, porque rodam numa única transação (exceto comandos que o Postgres não aceita em transação, como `CREATE INDEX CONCURRENTLY`: esses vão numa migration separada). Confira em A.5.

Se aparecer uma execução **Cancelled**, é porque chegou outra mais nova enquanto ela esperava (por outra execução em andamento ou pela aprovação): vale a mais nova, que aplica tudo o que estiver pendente. Nenhuma migration é pulada.

A Vercel publica o código assim que o merge acontece, e a migration roda em paralelo, sem garantia de ordem. Por isso, a migration entra **antes** do código que depende dela. Um PR que traga migration e o código que a usa é risco de erro 500 em produção: o código novo pode subir antes de a migration terminar.

- Tabela ou coluna nova que o código já vai usar: um PR só com a migration (e o que não depende dela); espere o job ficar verde (com a trava ligada, aprove antes); só então o merge do PR com o código que lê a tabela ou coluna nova.
- Remover ou renomear algo que o código em produção ainda usa: o contrário. Primeiro o código deixa de usar, depois a migration remove.

Para aplicar sem merge (ex.: uma migration que entrou antes deste workflow existir): **Actions > Migrations (produção) > Run workflow**, na `main`, e, se a trava de aprovação estiver ligada, aprove como acima.

#### A.4.3 Plano B: pelo seu computador

Só se o GitHub Actions estiver indisponível. Rode no PowerShell, na pasta do repositório. **Uma linha por vez**, sem colar várias de uma vez:

1. **Impedir que o PowerShell grave estes comandos no histórico** (vale só para esta janela; a URL tem a senha do banco):

   ```powershell
   Set-PSReadLineOption -HistorySaveStyle SaveNothing
   ```

2. Guardar a URL do **Session pooler** do `flomo-prod` na variável do terminal:

   ```powershell
   $env:DATABASE_URL_MIGRATIONS = "postgresql://postgres.<ref>:<senha>@<host-do-pooler>:5432/postgres"
   ```

   Isso não imprime nada. A variável do terminal vale mais que a do `.env.local`, então o `.env.local` (flomo-dev) não é tocado.

3. **Conferir** que a variável foi definida (não imprime a URL):

   ```powershell
   if ($env:DATABASE_URL_MIGRATIONS) { "definida" } else { "VAZIA" }
   ```

   Se aparecer `VAZIA`, **pare**: sem a variável, o `drizzle-kit` usaria o `.env.local` e aplicaria as migrations no `flomo-dev` (inofensivo, mas não é o que você quer).

4. Aplicar:

   ```powershell
   pnpm db:migrate
   ```

   O comando aplica só as migrations que ainda não estão no banco. Se só aparecerem avisos de "already exists, skipping", ele provavelmente rodou em outro banco. A prova de que deu certo é o passo A.5.

5. Limpar a variável e fechar a janela do terminal:

   ```powershell
   Remove-Item Env:DATABASE_URL_MIGRATIONS
   ```

   Se você não executou o passo 1 e a URL ficou no histórico, apague o histórico do PowerShell (`Remove-Item (Get-PSReadLineOption).HistorySavePath`; isso apaga **todo** o histórico de comandos) e, se achar necessário, redefina a senha do banco em **Project Settings > Database**.

### A.5 Conferir

No Supabase, em **Table Editor**, a tabela `profiles` deve existir com o selo de **RLS** ativo. E a Data API continua desligada (A.2).

Para uma migration nova, confira no **SQL Editor**: `select id, created_at from drizzle.__drizzle_migrations order by id;` lista uma linha por migration aplicada (a quantidade deve bater com a de arquivos `.sql` em `drizzle/`), e as tabelas novas aparecem no **Table Editor** com o selo de **RLS**.

---

## B. Vercel

**Objetivo:** o app publicado em uma URL `https://<nome>.vercel.app`, ligado ao `flomo-prod`.

### B.1 Importar o repositório

1. Em vercel.com, **Add New > Project** e **Import** de `flomo-labs/flomo`. Autorize o GitHub da organização se for pedido.
2. Confira: **Vercel Team** (o seu time, plano Hobby), **Project Name** `flomo`, **Root Directory** `./`, **Application Preset** Next.js.
3. **Não** adicione a integração opcional do Supabase (botão Add). As variáveis são cadastradas à mão, para controlar qual projeto cada ambiente usa.

> Plano **Hobby** é só para **uso não comercial**. Quando houver anúncios ou assinaturas, será preciso mudar de plano (ver `docs/regras-de-negocio.md`).

### B.2 Variáveis de ambiente

Abra **Environment Variables** na mesma tela e cadastre, uma a uma (nome, valor e em **Environments** escolha onde vale):

| Variável                               | Production                                | Preview                                  |
| -------------------------------------- | ----------------------------------------- | ---------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                 | URL de produção (passo B.4)               | **não definir**                          |
| `NEXT_PUBLIC_SUPABASE_URL`             | Project URL do `flomo-prod`               | Project URL do `flomo-dev`               |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable do `flomo-prod`               | publishable do `flomo-dev`               |
| `SUPABASE_SECRET_KEY`                  | secret do `flomo-prod`                    | secret do `flomo-dev`                    |
| `DATABASE_URL`                         | Transaction pooler do `flomo-prod` (6543), usuário `flomo_app.<ref>` | Transaction pooler do `flomo-dev` (6543), usuário `flomo_app.<ref>` |
| `TMDB_API_KEY`                         | chave do TMDB                             | a mesma chave                            |
| `SENTRY_DSN` (opcional)                | DSN do projeto no Sentry (B.2.1)          | **não definir** (ou um projeto de teste) |

#### B.2.1 Sentry (erros do servidor)

1. Crie conta em sentry.io (plano gratuito) e um projeto da plataforma **Next.js** chamado `flomo`. Escolha a região da UE ou dos EUA e anote qual, pois a política de privacidade cita o serviço.
2. Em **Settings > Projects > flomo > Client Keys (DSN)**, copie o DSN.
3. Na Vercel, cadastre `SENTRY_DSN` **só em Production**, e faça **Redeploy** (o servidor lê a variável ao subir).
4. Sem `SENTRY_DSN` o Sentry fica desligado (local, testes, previews). Só erros do servidor são enviados, sem IP, cookies nem cabeçalhos.

Pontos importantes:

- **A mesma variável, valores diferentes por ambiente.** A Vercel aceita o mesmo nome em Production e em Preview com valores distintos. Se o formulário da primeira tela marcar todos os ambientes, cadastre só as de Production agora e as de Preview depois, em **Settings > Environment Variables** do projeto, desmarcando os outros ambientes.
- **`NEXT_PUBLIC_*` vai para o navegador:** só valores públicos. A `SUPABASE_SECRET_KEY` e a `DATABASE_URL` **nunca** levam esse prefixo.
- **Sensitive:** se a opção **Sensitive** aparecer, marque em `SUPABASE_SECRET_KEY`, `DATABASE_URL` e `TMDB_API_KEY`. O app funciona igual; o valor só deixa de ser exibido depois de salvo (guarde o original). Uma variável Sensitive não pode ser editada nem lida depois: se marcar o ambiente errado, apague e cadastre de novo. Por isso, confira os ambientes **antes** de salvar.
- **Não cadastre** `DATABASE_URL_MIGRATIONS`, `DATABASE_URL_TEST` nem `FLOMO_PROD_DB_REF`: migrations e testes rodam no seu computador ou no CI, não na Vercel.

### B.3 Primeiro deploy

Clique em **Deploy** e espere o build (1 a 3 minutos). Se falhar, abra o deploy, **Build Logs**, e leia as últimas linhas em vermelho.

### B.4 Definir a URL do site e refazer o deploy

1. Copie a URL de produção (por exemplo, `https://flomo-xxxx.vercel.app`, sem barra no final).
2. Em **Settings > Environment Variables**, cadastre `NEXT_PUBLIC_SITE_URL` com essa URL, marcada **só em Production**.
3. Em **Deployments**, no último deploy, menu **...** > **Redeploy**.

**Por quê o Redeploy:** variáveis `NEXT_PUBLIC_*` são embutidas no código durante o build. Mudar o valor sem refazer o deploy não tem efeito. Em Preview a variável não é definida: o app usa o endereço do próprio deploy (`src/app/_auth/site-url.ts`), porque cada preview tem uma URL diferente.

### B.5 Conferir

- A URL abre a página inicial, e `<URL>/privacidade` e `<URL>/termos` também.
- Em **Settings > Git**, a branch de produção é a `main`.
- Em **Settings > Deployment Protection**, mantenha a proteção padrão dos previews: eles usam o `flomo-dev` e têm login real, então não devem ficar públicos sem necessidade.
- A região das funções vem do `vercel.json` (`gru1`). Em **Settings > Functions** ou nos detalhes do deploy pode aparecer a região; no plano Hobby a tela às vezes não mostra o valor.

Anote o **slug do time** (em **Settings > General > Team URL**, `vercel.com/<slug>`): ele entra no padrão das URLs de preview na parte D.

---

## C. Google: cliente OAuth de produção

**Objetivo:** permitir que o Google devolva o usuário logado para o Supabase de produção.

No console.cloud.google.com, no projeto do Flomo, menu **Google Auth Platform**:

1. **Clientes > Criar cliente**, tipo **Aplicativo da Web**, nome `Flomo prod`.
2. **Origens JavaScript autorizadas:** a URL de produção da Vercel (`https://<nome>.vercel.app`).
3. **URIs de redirecionamento autorizados:** `https://<ref-do-flomo-prod>.supabase.co/auth/v1/callback`. É o endereço do **Supabase**, não do app: o Google devolve o usuário ao Supabase, que depois o devolve ao app.
4. Crie e guarde o **Client ID** e o **Client Secret**. O secret é colado só no painel do Supabase (parte D).
5. **Branding:**
   - **Nome do app:** Flomo.
   - **Página inicial:** a URL de produção.
   - **Política de privacidade:** `<URL>/privacidade`.
   - **Termos de serviço:** `<URL>/termos`.
   - **E-mail de suporte** e de contato do desenvolvedor.
   - Domínio autorizado: sem domínio próprio, deixe em branco (`vercel.app` não é aceito). Para o beta isso não bloqueia o login; a verificação de marca fica para quando houver domínio.
6. **Acesso a dados:** só os escopos básicos `openid`, `.../auth/userinfo.email` e `.../auth/userinfo.profile`.
7. **Público-alvo:** deixe **Externo**. A publicação é a parte E, depois do teste.

---

## D. Supabase: login e URLs

### D.1 No `flomo-prod`

(Confira o nome do projeto no canto superior esquerdo do painel.)

1. **Authentication > Sign In / Providers > Google:** ative, cole o **Client ID** e o **Client Secret** da parte C e salve. A **Callback URL** exibida na tela deve ser igual à cadastrada no Google (passo C.3).
2. **Authentication > URL Configuration:**
   - **Site URL:** a URL de produção.
   - **Redirect URLs:** acrescente `<URL de produção>/auth/callback`.
3. Em Sign In / Providers, deixe desligados e-mail, telefone e anônimo, até a Fase 1.7 (conta por e-mail).

### D.2 No `flomo-dev` (para o login funcionar nos previews)

Em **Authentication > URL Configuration > Redirect URLs**, **acrescente**, sem apagar as existentes:

```
https://flomo-*-<slug-do-time>.vercel.app/auth/callback**
```

O `**` no fim é necessário nesta entrada com curinga: o app volta para `/auth/callback?next=...`, e o padrão precisa cobrir também os parâmetros. Sem ele, o login em preview cai no Site URL (`localhost:3000/?code=...`). Ele só é seguro porque o host continua preso a `flomo-*-<slug-do-time>`; o `**` vale apenas para o que vem depois do host. Quem já cadastrou a versão antiga (sem `**`) deve **substituí-la** por esta.

> **Nunca** use `https://*.vercel.app/**`. Qualquer pessoa publica um app em `vercel.app`, e um padrão tão aberto permitiria que um site de terceiros recebesse o código do login. O padrão acima restringe ao seu time.

### D.3 Teste de ponta a ponta

Em uma aba anônima, em `<URL de produção>`:

1. **Entrar com Google** e escolher a conta.
2. Primeiro login: o app leva a `/cadastro`; escolha um nome de usuário e continue (volta para a página inicial com "Olá, @nome").
3. Abra `/configuracoes`, troque o nome e salve.
4. **Sair** (volta deslogado) e entre de novo: deve ir direto para a página inicial, com o nome novo.
5. No navegador, F12 > **Application > Cookies**: o cookie `sb-…-auth-token` deve estar marcado como **HttpOnly** e **Secure**.

---

## E. Publicar o app OAuth do Google

Enquanto o app estiver em modo **Testando**, só as contas da lista de testadores conseguem entrar. Para abrir a qualquer conta Google:

1. Google Auth Platform > **Público-alvo > Publicar app** e confirme. Antes de confirmar, abra o link de privacidade e o de termos cadastrados em **Branding** e confira se abrem em produção. O aviso sobre "enviar para verificação" costuma valer só com mais de 10 domínios, logotipo ou escopos restritos; com os escopos básicos de e-mail e perfil, normalmente não se aplica. Se o Google mostrar "app não verificado" para contas fora da lista de testadores, abra a **Central de verificação** do Google Auth Platform e siga o que ela pedir (pode exigir domínio próprio).
2. Teste o login com uma conta Google que **não** esteja na lista de testadores.

---

## F. Limite de requisições das sugestões da busca (recomendado)

`GET /api/sugestoes` é público e tem só um freio parcial na memória de cada instância (`src/lib/rate-limit.ts`, 60 por minuto por IP). O corte firme é uma regra de rate limit na Vercel, que barra na borda antes de o código rodar:

1. No projeto da Vercel, abra **Firewall** e crie uma regra de rate limit (o nome dos botões pode mudar; veja a documentação "Vercel WAF rate limiting").
2. Condição: caminho igual a `/api/sugestoes`. Limite sugerido: 100 requisições por minuto por IP. Ação: responder 429.
3. Se o plano não permitir a regra, o freio da memória e o cache de 1 dia da resposta continuam valendo.

## Armadilhas conhecidas

| Sintoma                                                                                                  | Causa e solução                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `password authentication failed for user "postgres"` (ou `"flomo_app"`) nos logs, `/cadastro` com "A server error occurred" | Usuário sem o `.<ref>` (conexão direta) ou senha errada. Use a URL do **Transaction pooler**, com usuário `flomo_app.<ref>` e a senha definida em A.3, e refaça o Redeploy. |
| `$env:DATABASE_URL_MIGRATIONS` vazio e migrations "aplicadas" que só mostram `already exists, skipping`  | No plano B (A.4.3), a variável não foi definida e o `drizzle-kit` usou o `.env.local` (flomo-dev). Defina a variável e confira antes de rodar.                                      |
| Workflow **Migrations (produção)** falha com "Defina o segredo..." ou "não é a URL do Session pooler"    | Falta o segredo ou a variável no ambiente `supabase-prod`, ou a URL é de outro projeto (A.4.1). Confira se `FLOMO_PROD_DB_REF` está em **Environment variables**, e não em secrets. |
| Workflow parado em **Waiting**                                                                           | A trava de aprovação do `supabase-prod` está ligada: aprove (A.4.2) ou desligue em A.4.1.                                                                                           |
| Login em preview termina em `localhost:3000/?code=...` (`ERR_CONNECTION_REFUSED`)                        | O padrão de preview no `flomo-dev` não casa com a URL de volta: confira o `**` no fim e o slug do time (D.2).                                                                       |
| Login volta para `/entrar?erro=google`                                                                   | Redirect URL ausente no Supabase (D.1 e D.2), ou `NEXT_PUBLIC_SITE_URL` errada.                                                                                                     |
| Mudei `NEXT_PUBLIC_SITE_URL` e nada mudou                                                                | Variáveis `NEXT_PUBLIC_*` só valem após um novo build: faça **Redeploy**.                                                                                                           |
| Login funciona em produção e falha em previews                                                           | Falta o padrão de previews no `flomo-dev` (D.2), falta o `**` no fim dele, ou o slug do time está errado.                                                                           |

## Depois do deploy

- Cada pessoa do time atualiza o próprio `.env.local` com `DATABASE_URL_TEST`, apontando para o `flomo-dev`. Sem ele, `pnpm test:integration` recusa rodar. Opcional: `FLOMO_PROD_DB_REF` com o ref do `flomo-prod`, como trava extra.
- Tratar os alertas do Dependabot da `main` antes de divulgar a URL.
- Trocar `contactEmail` em `src/content/legal.ts` quando houver domínio e e-mail do projeto.
- Mudar para outro host ou serviço: ver `docs/troca-de-ferramentas.md`.
