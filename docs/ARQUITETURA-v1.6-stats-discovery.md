# Flomo — Arquitetura v1.6 (addendum)

> Nota: o produto se chamava UpNext. Ver ADR-002.

**Data:** 2026-09-14  
**Substitui parcialmente:** Word v1.5 + plano v1.0 (este addendum + plano v1.1 são a fonte da verdade daqui para frente)  
**Escopo desta revisão:** estatísticas avançadas, tela Explorar/descoberta, insights do OSS MediaTracker, referências Bingers / Suite TV / Up Next TV

---

## 1. Confirmação: o que já estava mapeado vs o que é novo

Legenda: **Já** = previsto no plano/arquitetura anterior (às vezes só como “stats básicas” ou fase 2/3). **Novo** = agora vira requisito explícito. **Parcial** = a base de dados existia, a UI/métrica não.

### 1.1 Estatísticas do usuário

| Pedido                                                            | Status                        | Comentário                                                                                                      |
| ----------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Gráficos episódios/filmes por dia/semana/mês/ano                  | **Parcial → agora explícito** | `watch_events` já era a fonte; faltava produto de stats temporais                                               |
| Ranking personagens preferidos (votos)                            | **Novo**                      | Exige voto por episódio/título (Suite TV)                                                                       |
| Ranking atores mais assistidos                                    | **Novo**                      | Exige cache de créditos TMDB + join com watch_events                                                            |
| Ranking gêneros mais vistos                                       | **Parcial**                   | `title_genres` já previsto; faltava agregação                                                                   |
| Tempo total assistido (horas)                                     | **Já (stats básicas)**        | Soma de `runtime` dos watch_events                                                                              |
| Ranking séries/filmes mais assistidos (rewatch)                   | **Parcial**                   | `watch_events` já cobria rewatch                                                                                |
| Quantidade por status (quero ver, em breve, sem ver há um tempo…) | **Parcial**                   | Status de biblioteca sim; **“em breve”** e **“sem ver há um tempo”** são **derivados** (Suite), não só `paused` |
| Tempo restante para terminar o que falta                          | **Novo**                      | Soma runtime de episódios aired não vistos da biblioteca                                                        |
| Gráfico tempo/episódios futuros por mês                           | **Novo**                      | Calendário + episódios upcoming da biblioteca                                                                   |
| Ranking entre amigos quem mais assistiu                           | **Novo**                      | Social + agregação comparativa                                                                                  |
| Média/total por dia da semana                                     | **Novo**                      | Agregação de `watch_events` por `dow`                                                                           |
| Ranking reações/emoções por episódio/filme                        | **Novo**                      | Modelo de reação (Suite)                                                                                        |
| ETA para zerar backlog no ritmo atual                             | **Novo**                      | `remaining_runtime / pace`                                                                                      |
| Velocidade (eps/filmes/tempo por dia/mês/ano)                     | **Novo**                      | Pace a partir de watch_events                                                                                   |
| Contagem comentários/avaliações feitos                            | **Parcial**                   | Tabelas reviews/ratings já previstas                                                                            |
| Curtidas recebidas                                                | **Parcial**                   | `reactions` já previsto; agora é métrica de perfil                                                              |
| Ranking amigos por pontuação de comentários                       | **Novo**                      | Agregação social                                                                                                |
| Momentos históricos no perfil                                     | **Novo**                      | Eventos derivados (primeiro título, dia recorde…)                                                               |
| Evolução de gosto por gênero no tempo                             | **Novo**                      | Série temporal de watch_events × genres                                                                         |
| Distribuição por década da obra                                   | **Novo**                      | `release_date` / first_air_date                                                                                 |
| Match de amigos (gosto parecido)                                  | **Novo**                      | Similaridade (gênero + títulos em comum)                                                                        |
| Wrapped anual compartilhável                                      | **Novo**                      | Job anual + artefato estático/share                                                                             |

### 1.2 Busca e descoberta (Explorar)

| Pedido                                                   | Status          | Comentário                                            |
| -------------------------------------------------------- | --------------- | ----------------------------------------------------- |
| Séries/filmes em alta, novos, populares, mais aguardados | **Parcial**     | TMDB trending/upcoming/popular; faltava tela Explorar |
| Coleções/listas populares                                | **Parcial**     | Listas CRUD na sprint 2; ranking público é novo       |
| Recomendado para você                                    | **Já (fase 3)** | Agora entra no backlog Explorar com contrato          |
| Recomendado por amigos (geral ou dirigido a você)        | **Novo**        | Entidade `title_recommendation`                       |
| Títulos que pessoas com gosto parecido assistem          | **Novo**        | Collaborative filtering simples                       |
| Usuários com gostos parecidos                            | **Novo**        | Mesmo motor de match                                  |
| “Porque você assiste/assistiu X”                         | **Novo**        | TMDB similar/recommendations + ratings altos do user  |
| Bem avaliados do momento                                 | **Parcial**     | TMDB top_rated + média interna Flomo                  |
| Populares no streaming que o usuário assina              | **Novo**        | `user_streaming_subscriptions` + TMDB watch/providers |

**Não limitamos o app a esta lista.** O domínio deve ser extensível (eventos, créditos, reações, recs) sem reescrever o núcleo.

---

## 2. Referências de produto (inspiração, não clone)

| App                                    | O que usar como inspiração                                                                                                       | O que **não** copiar                                                  |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [Bingers](https://bingers.app/)        | Watchlist rápida + comunidade/reações; fundador do TV Time                                                                       | Branding, assets, copy                                                |
| [Suite TV](https://www.suitetv.app/pt) | Up Next vs Em breve; “sem ver há um tempo”; rating **por episódio**; emoção; personagem favorito; rewatch; import TV Time; stats | Layout 1:1, dumps de catálogo da landing                              |
| [Up Next TV](https://upnexttv.app/)    | “Tonight / next episode”; calendário simples; privacidade                                                                        | Nome (conflito com o nome anterior, UpNext); iCloud-only; “sem conta” |

**Conflito de marca (reforço):** [upnexttv.app](https://upnexttv.app/) é um tracker iOS independente. Manter white-label; validar domínio/nome BR.

### Screenshots úteis (se quiser enviar depois)

Não bloqueiam a arquitetura. Ajudam UX:

1. Suite: tela **A seguir**, **Em breve**, página de **episódio** (nota + emoção + personagem)
2. Bingers: feed de reações da comunidade e detalhe de título
3. Up Next TV: home “tonight’s episodes” e calendário

---

## 3. Análise ética de [bonukai/MediaTracker](https://github.com/bonukai/MediaTracker)

### 3.1 Licença

- **MIT License** — Copyright (c) 2022 bonukai
- Arquivo: `LICENSE.md` no repositório
- Permite uso, cópia, modificação, publicação, sublicença e venda **desde que** o aviso de copyright e a permissão MIT acompanhem **cópias ou porções substanciais** do Software.

### 3.2 O que o projeto é (e não é)

MediaTracker é um **tracker self-hosted** (movies, TV, games, books, audiobooks): Express + Knex (SQLite/Postgres) + React 17 + Tailwind + calendário FullCalendar. **Não** é uma rede social pública tipo Letterboxd/TV Time.

Útil como **estudo de domínio**, não como base do Flomo (produto social, Next.js, Supabase, BR).

### 3.3 Como usar de forma ética (obrigatório)

| Permitido                                                         | Proibido / evitar                                         |
| ----------------------------------------------------------------- | --------------------------------------------------------- |
| Ler código para aprender padrões                                  | Copiar o repositório inteiro e relançar como Flomo        |
| Reimplementar ideias na nossa stack                               | Copiar UI, nomes de rotas e trechos longos sem atribuição |
| Se copiar trecho substancial: manter MIT header + `NOTICE`        | Remover copyright do autor                                |
| Citar no README/TCC: “inspirado em padrões de MediaTracker (MIT)” | Apresentar código alheio como original no TCC             |
| Fork no GitHub só para estudo                                     | Dependência runtime do pacote `mediatracker` no produto   |

**Política Flomo (decisão):** **não forkamos** MediaTracker. Reimplementamos. Se no futuro um arquivo for derivado de trecho deles, registrar em `docs/THIRD_PARTY.md` + copyright MIT.

### 3.4 Ideias úteis a **reimplementar** (não copiar código)

| Padrão MediaTracker                                  | Como aplicar no Flomo                                      |
| ---------------------------------------------------- | ---------------------------------------------------------- |
| Interface `metadataProvider` + providers TMDB/IGDB/… | Catalog Gateway plugável (TMDB agora; TVmaze depois)       |
| `requestQueue` (fila + limite)                       | Rate limit TMDB no gateway (não estourar quota)            |
| `updateMetadata` em job, não no request do user      | Já previsto: jobs/cron                                     |
| Controller `calendar`                                | Endpoint `/calendar` a partir de episódios cached          |
| `seen` como histórico (não só flag)                  | Já: `watch_events`                                         |
| `statisticsController` dedicado                      | Bounded context `stats` + rollups                          |
| OpenAPI gerado das rotas                             | OpenAPI/Zod no `/api/v1`                                   |
| Import Trakt                                         | Fase posterior (já no Em breve); Suite também pede TV Time |
| Application token + webhook Plex/Jellyfin            | Fora do MVP; opcional V3 (scrobble)                        |
| i18n (Lingui/Crowdin)                                | next-intl; pt-BR first                                     |
| Docker self-host                                     | Não é o modelo SaaS do Flomo; opcional depois              |

**Não adotar:** SQLite como DB principal, Passport local como auth único, servir posters próprios em disco (usar CDN TMDB), stack Express+webpack client em vez de Next.

---

## 4. Ajustes de domínio (preparar sem implementar tudo agora)

Princípio: **instrumentar eventos ricos no MVP**; **páginas pesadas de stats/explorar nas fases 3–4**. Sem eventos ricos, Wrapped e rankings de ator/personagem ficam impossíveis depois.

### 4.1 Novas entidades (schema preparado)

```
people                    -- cache TMDB person
credits                   -- title_id, person_id, role (cast|crew), character_name, order
user_streaming_subscriptions -- user_id, provider_id (TMDB watch provider), is_active

episode_checkins          -- opcional alias conceitual de watch_events no episódio
  + rating_half_stars?    -- rating POR EPISÓDIO (Suite)
  + emotion_id?           -- reação/emoção
  + favorite_person_id?   -- personagem favorito daquele episódio

emotions                  -- catálogo (ex.: chocado, rindo, chorando) — seed
reactions                 -- já previsto: likes em review/comment; reusar para episódio

title_recommendations     -- from_user_id, to_user_id NULL=público, title_id, message
user_taste_vectors        -- projeção: pesos por gênero (job noturno)
user_similarity           -- pares user_a, user_b, score (job)
stat_rollups              -- user_id, period (day|week|month|year), counts, minutes
user_milestones           -- first_title_at, record_day, etc. (ou derivar)
yearly_wraps              -- user_id, year, payload JSONB do Wrapped (gerado 1x/ano)

explore_shelves_cache     -- prateleiras TMDB (trending etc.) TTL curto
```

`watch_events` continua a fonte da verdade de “assisiti em T”. Check-in de episódio pode **estender** o evento (rating/emotion/character) sem tabela paralela se preferirem uma linha rica:

**Recomendação:** uma tabela `watch_events` com colunas opcionais `emotion_id`, `favorite_person_id`, `rating_half_stars` no episódio **ou** tabela `episode_reactions` 1:1 com o evento. Preferir **colunas no evento** no MVP para menos joins; extrair se crescer.

### 4.2 Status derivados (Suite) — não virar enum a mais sem necessidade

Calcular na leitura / materialized:

| Label UI                 | Regra                                               |
| ------------------------ | --------------------------------------------------- |
| Para assistir / A seguir | Há episódio aired não visto (Up Next)               |
| Em breve                 | Próximo episódio com `air_date` futuro              |
| Sem ver há um tempo      | `watching` e último `watch_event` > N dias (ex. 21) |
| Pausado                  | status explícito                                    |
| Quero ver                | watchlist                                           |

### 4.3 Stats: estratégia de performance

1. **MVP/spike:** não construir a página completa.
2. **Fase stats v1:** queries em `watch_events` + créditos para 1 usuário (ok até ~10k eventos).
3. **Fase stats v2:** job diário preenche `stat_rollups` e `user_taste_vectors`.
4. Wrapped: job em dezembro (ou on-demand) grava `yearly_wraps`; share = imagem/OG + link `/wrap/2026/:user`.

**Nunca** calcular Wrapped/match de todos os amigos no request da home.

### 4.4 Descoberta: camadas

| Camada         | Fonte                                                  | Cache          |
| -------------- | ------------------------------------------------------ | -------------- |
| Editorial/TMDB | trending, popular, upcoming, top_rated, now_playing    | 15 min–6 h     |
| Assinaturas    | TMDB discover `with_watch_providers` + country=BR      | 6 h            |
| Pessoal        | ratings altos + similar TMDB                           | 24 h / user    |
| Social         | `title_recommendations` + feed amigos                  | realtime/curto |
| Collab         | usuários similares → títulos que eles viram e você não | job noturno    |

### 4.5 Módulos novos no monólito

`stats`, `explore`, `credits` (people), `taste` (similarity), `wrap`, `subscriptions` (streaming).

---

## 5. Implicações para o MVP (não inflar o spike)

O **spike vertical permanece o mesmo.** O que muda é **instrumentar**:

No check-in de episódio, já aceitar (mesmo que a UI seja depois): `emotion`, `favorite_person_id`, `episode_rating`.  
No perfil: `streaming_provider_ids`.  
No catálogo: persistir **credits** quando buscar detalhe do título (lazy).  
`runtime` em episode/title obrigatório para horas/ETA.

Página `/stats` e `/explorar` completas = **Fase 3–4**, listadas em `/em-breve` até lá.

---

## 6. Privacidade e ética de produto

- Rankings entre amigos: só `follows.accepted` e perfis que permitem stats.
- Match de gosto: opt-in (`share_taste_for_match`).
- Wrapped: opt-in de compartilhamento público.
- Rankings de personagem/ator: dados TMDB + votos do user; atribuição TMDB.

---

## 7. Perguntas em aberto (não bloqueiam schema)

1. Emoções: catálogo fixo (Suite-like) ou livre? **Default:** catálogo fixo seed.
2. Personagem favorito: só no episódio ou também no título? **Default:** episódio agora; título depois.
3. N dias para “sem ver há um tempo”? **Default:** 21, configurável.
4. Wrapped: só calendário civil (1 jan–31 dez) BR? **Default:** sim.
5. “Recomendado por amigos” dirigido: precisa de notificação? **Default:** sim, tipo `recommendation_received`.

---

_Fim do addendum v1.6._
