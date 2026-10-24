# Design system do Flomo

Referência do visual real do app (direção A, Fase 1.8), extraída do código. Fonte dos tokens: `src/app/globals.css`. Desenho aprovado dos componentes compartilhados: `design/1.8-opcoes/componentes/pr3-componentes.png` (fica no Project, não no repo).

**Regra de ouro:** ajustes visuais específicos feitos no código fazem parte do padrão, não são desvios. Ao padronizar (#122, #123), inventarie primeiro, preserve o que foi ajustado de propósito e atualize este arquivo. Mudou um padrão? Atualize aqui no mesmo PR.

**Camadas:** tokens em `globals.css` → primitivos shadcn em `src/components/ui/` → componentes do projeto em `src/components/` (por domínio: `catalog/`, `shell/`, `landing/`) → telas em `src/app/`. Nada de cor, raio ou largura fixos em tela: use o token. Trocar de direção visual depois mexe só nos tokens e nos primitivos.

## 1. Fundamentos

- Tema único: **escuro** (`<html class="dark">`). O tema claro existe nos tokens (shadcn) mas não é usado. Estilo shadcn `base-nova`, base `neutral`, ícones próprios (ver 4).
- Cor de acento: **magenta** (matiz ~4 em oklch), vinda do preset.
- Ícone do app (**provisório**, até termos um desenhado pela dupla): símbolo de "próximo" dos players (play + barra), branco sobre magenta `#A3004C` (o `primary` em hex), centrado nos dois eixos. Fala do Seguintes: o que assistir em seguida. Arquivos em `src/app/` pela convenção de metadados do Next: `icon.svg` (abas, cantos `rx="7"` em 32), `favicon.ico` (16, 32 e 48 px, navegadores antigos) e `apple-icon.png` (180 px, quadrado cheio: o iOS arredonda sozinho). Trocar o ícone = trocar os três arquivos.

### Cores (tokens semânticos; usar `bg-*`, `text-*`, `border-*`)

| Token | Escuro | Uso |
|---|---|---|
| `background` / `foreground` | `0.145` / `0.985` | página / texto |
| `card`, `popover` | `0.205` | cartões, menus, diálogos |
| `primary` | `oklch(0.459 0.187 3.815)` | botão principal, estrela da nota, badge "planejado" |
| `secondary` | `0.274` | botão secundário |
| `muted` / `muted-foreground` | `0.269` / `0.708` | trilhas, esqueletos, texto de apoio |
| `accent` | `0.269` | hover de item de menu |
| `destructive` | `oklch(0.704 0.191 22)` | erro, ação destrutiva (sempre em fundo translúcido 10–20%) |
| `success` / `success-foreground` | `oklch(0.52 0.14 150)` / `0.985` | sucesso: fundo do aviso de "salvo" (`Toaster`); verde escuro o bastante para texto branco |
| `border` | branco 10% | bordas |
| `input` | branco 15% | borda de campo; fundo de campo = `input/30` |
| `ring` | `0.556` | foco (anel 3px a 50%) |
| `sidebar-primary` | `oklch(0.656 0.241 354)` | **item ativo da navegação** (texto) e fundo a 15% (pílula) |
| `rank-from` / `rank-to` | `oklch(0.85 0.12 3.8)` / `oklch(0.62 0.22 3.8)` | degradê do número do ranking |
| `tmdb` | `#01b4e4` | só o nome do TMDB na atribuição |
| `chart-1..5` | escala de magenta | reservado (estatísticas) |

Padrões de uso de cor:
- Item ativo = **magenta translúcido** (`bg-sidebar-primary/15 text-sidebar-primary`), nunca o roxo do Esboço.
- Etiqueta de episódio (`T2:E4`) = `bg-primary/25 text-primary-foreground`, pílula.
- Texto de apoio = `text-muted-foreground`. Estrelas vazias = `text-muted-foreground/30`.
- Sobre pôster, texto sempre branco sobre degradê preto (`from-black/85 via-black/50 to-transparent`).

### Tipografia
- Fonte: **Inter** (`--font-sans`, também `--font-heading`); mono: Geist Mono (`--font-mono`).
- Utilitários: `text-page-title` (24px celular / 30px desktop, 700), `text-section-title` (20px, 600), `text-section-title-lg` (24px, 700; telas só de listas, como o Descobrir).
- Corpo `text-sm` (14px) é o padrão da interface (64 usos); `text-xs` (12px) para etiquetas e metadados; `text-base` só em campos (evita zoom no iOS; `md:text-sm`).
- Título de cartão: `text-sm font-medium leading-tight line-clamp-2`. Logo: `text-lg font-bold`. Rótulo da barra inferior: `0.625rem`.

### Espaçamento
Escala Tailwind (4px). Mais usados: `gap-2` (8), `gap-3` (12), `gap-1`, `gap-4`, `gap-6` (entre blocos da página); entre seções de listas do Descobrir, `gap-10` (celular) / `gap-12` (`md+`). Grades de pôster: `gap-3`. Sem espaçamentos arbitrários.

### Raios
Base `--radius: 0.875rem` (14px). Escala shadcn: `sm` 0.6×, `md` 0.8×, `lg` 1×, `xl` 1.4×, `2xl` 1.8×, `4xl` 2.6×.
Tokens do app: `rounded-poster` (12px, pôsteres) e `rounded-card` (16px, cartões e linhas). Campos `rounded-lg`, exceto os de **busca** (cabeçalho e `SearchForm` do celular), que são `rounded-full`; botões `rounded-full` (padrão do `Button`); diálogos `rounded-xl`; **filtros, abas e etiquetas `rounded-full`**; bottom sheet `rounded-t-2xl`. **Raios concêntricos:** o raio de um elemento dentro de outro = raio externo − espaço entre eles (ex.: chuvisco da `EmptyTv`: borda 8, traço 3, folga 2,5 → tela 4).

### Sombras e profundidade
Quase sem sombra: profundidade vem de borda (`border-border`) e `ring-1 ring-foreground/10` (diálogo). Exceções: aba ativa `shadow-sm`; menu "···" da landing com sombra forte própria (`.landing-menu`). Overlay de diálogo: `bg-black/10` + `backdrop-blur-xs`.

### Layout
- `page-container`: coluna centrada, máx. `--container-page` (**60rem**), margem lateral 16px (celular) e 32px (≥768px). Textos longos: `max-w-reading` (**48rem**).
- Breakpoints: `sm` 640, `md` 768 (corte celular/desktop do shell).
- Cabeçalho: `h-16`, borda inferior. Barra inferior do celular: `h-16` + `safe-area-inset-bottom`, só logado; o `body` reserva o espaço (`[data-bottom-nav]`).
- Alvos de toque: com `pointer-coarse`, botões, abas e ícones sobem para **44px** (`h-11`/`size-11`); abas, 50px de lista.
- Movimento: respeitar `prefers-reduced-motion` (onda dos pôsteres da landing e chuvisco da TV vazia param). Regra global em `globals.css`: com "reduzir movimento", toda animação e transição (diálogos, menus, dicas, hover) vira instantânea; não precisa de `motion-safe:` em componente novo.
- Celular deitado/entalhe: `viewport-fit=cover` + `page-container` com `padding-left/right: max(margem, env(safe-area-inset-*))`. Altura de camadas sobrepostas em `dvh`, nunca `vh`.

## 2. Componentes

### Primitivos (`src/components/ui/`, shadcn + Base UI)
- **Button**: variantes `default` (magenta), `outline`, `secondary`, `ghost`, `destructive` (translúcido), `link`. Tamanhos: `xs` 24, `sm` 28, `default` 32, `lg` 36, `icon`/`icon-xs/sm/lg`. No toque vira 44px. **Todo botão é pílula (`rounded-full`) por padrão, em todos os tamanhos** (#162); não repetir `rounded-full` na tela. Dentro de `button-group` os botões voltam a `rounded-lg`. Ícone dentro: `data-icon="inline-start|inline-end"`.
- **Badge**: pílula `h-5`, variantes `default`, `secondary`, `destructive`, `outline`, `ghost`, `link`.
- **Input / Textarea / Checkbox / RadioGroup / Label**: altura 32, `rounded-lg`, borda `input`, fundo `input/30`, foco com ring 3px, erro via `aria-invalid`.
- **Tabs**: lista `bg-muted` com `p-[3px]`, altura 32 (50 no toque), gatilho ativo `bg-background` + `shadow-sm` (escuro: `input/30`); variante `line` com sublinhado.
- **Dialog**: `rounded-xl bg-popover`, `max-w-sm`, botão de fechar fantasma redondo. Todo `DialogContent` é **bottom sheet no celular** (abaixo de `sm`: colado na base, largura total, `rounded-t-2xl`, alça no topo que fecha ao arrastar para baixo, respeita a área segura, desliza de baixo) e centralizado de `sm` para cima (#115); sem prop, todos herdam. Altura máxima `90dvh` no celular e `100dvh − 2rem` no desktop, com rolagem própria (teclado aberto, zoom 200%). Rodapé: botões empilhados no celular, em linha no desktop. **Cancelar** é sempre `Button variant="outline"` com `rounded-full` no rodapé.
- **Select** (#145): Base UI `Select`. Gatilho neutro `h-8` (44px no toque) com `chevronDown`; popup `rounded-lg bg-popover`, item `min-h-8` (44px no toque) com check no selecionado. Dentro de um título, o gatilho ganha as classes de pílula magenta (ver "Descobrir").
- **Toaster** (`ui/sonner.tsx`, #148): avisos rápidos do Sonner, montado uma vez no layout raiz. No desktop (`md+`), canto **inferior** direito, 24px da base e da borda; no celular, no alto, `4.5rem` do topo (abaixo do cabeçalho `h-16`), largura da tela menos 16px de cada lado (embaixo ficaria sobre a barra de navegação). A posição troca por `matchMedia` no mesmo corte `md`. Sucesso (`toast.success`) em **verde** (`success`, texto `success-foreground`); os demais avisos em `primary` (magenta). `richColors` ligado (sem ele o Sonner ignora as cores de sucesso), `rounded-card`, `shadow-lg`, ícone `check` preenchido no sucesso. O Sonner anuncia o texto ao leitor de tela e respeita `prefers-reduced-motion`. Chamar com `toast.success(texto, { id })`: o mesmo `id` substitui o aviso em vez de empilhar.
- **Skeleton**: bloco `motion-safe:animate-pulse bg-muted rounded-lg` (parado com `prefers-reduced-motion`); o formato vem do `className`. Padrão de carregamento em "Carregamento" abaixo.
- **DropdownMenu, Tooltip, Avatar, Progress (barra `h-1` `rounded-full`, preenchimento `primary`), Separator**.

### Compartilhados (`src/components/`)
| Componente | Para quê | Detalhes |
|---|---|---|
| `Poster` | pôster TMDB | 2:3, `rounded-poster`, `bg-muted` sem imagem |
| `PosterCard` | cartão de grade | pôster + título 2 linhas + complemento; hover `opacity-80` |
| `PosterRow` | linha de título | pôster 64/80px (`md`) ou 48/56px (`sm`), `rounded-card border p-3`, ação à direita (`trailing`) |
| `Shelf` / `ShelfSkeleton` | prateleira do Descobrir | grade 3 colunas (celular) / 5 (`sm+`); `ranked` = número em degradê (`-ml-5`) sobre escurecimento; esqueleto `animate-pulse` |
| `LoadingRegion` (`loading/`) | envolve qualquer esqueleto | `role="status"` + `aria-busy` com "Carregando…" só para leitor de tela; os blocos ficam em `aria-hidden`. Some junto com o esqueleto, então o leitor anuncia o carregamento uma vez |
| `PosterRowSkeleton`, `PosterGridSkeleton`, `TitleSkeleton` / `EpisodesSkeleton` / `EpisodeListSkeleton`, `ProfileSkeleton`, `FormSkeleton` (`loading/`) | esqueletos por bloco de layout | copiam borda, espaçamento e largura do componente real (`PosterRow`, grade da Biblioteca, cabeçalho do título, campos `h-8`) para não haver salto de layout; `ShelfSkeleton` segue na prateleira |
| `RouteProgress` (`loading/`) | `loading.tsx` de `(publico)` e `configuracoes` | barra `h-1` fixa no topo (`z-50`), trecho `primary` que corre sobre trilha `primary/20`; parada e cheia com `prefers-reduced-motion` (`.route-progress-bar` em `globals.css`) |
| `SegmentedControl` | filtro em pílula (Biblioteca, Seguintes, tipo Tudo/Séries/Filmes do "Em alta no serviço") | uma opção ativa; estado fica na tela. Trilha `bg-muted` `rounded-full`, ativa em `bg-primary` + `text-primary-foreground` (magenta, texto branco), inativas cinza. A pílula magenta é um indicador (`Tabs.Indicator` da Base UI) que desliza até a opção escolhida e acompanha a largura dela (0,3 s, `ease-out`; sem animação com `prefers-reduced-motion`). Opção pode vir `disabled` com `hint` (tooltip). `Tabs` do shadcn continua só como base; telas usam o `SegmentedControl` (#122) |
| `SectionHeader` | título de seção + ação ("Ver tudo"; `wrap` deixa a ação descer para a linha de baixo quando não cabe) | `size` `default` (`text-section-title`) ou `lg` (`text-section-title-lg`, Descobrir) |
| `ScrollHintRow` | faixa que rola para o lado só no celular (chips de temporadas, números do perfil) | abre com o item `aria-current` centralizado; degradê largo (`from-background`, 96px) com seta `chevronForward` na borda direita, que some no fim; o último item aparece cortado de propósito. A partir de `md` não rola e sem degradê. `as` (`div` ou `nav`), `ariaLabel` opcional |
| `SeasonStrip` (`catalog/`) | chips de temporadas (tela do título): `ScrollHintRow` como `nav`; no desktop os chips quebram linha | `ariaLabel`; o título da seção traz a contagem em `text-muted-foreground`: "Temporadas (8)" |
| Números do perfil (`StatsList`, na tela do perfil) | cinco cartões `rounded-card` (séries, filmes, episódios, tempo assistido, notas) | celular: linha rolável dentro de `ScrollHintRow`, cartões `min-w-32`; `md`: grade de 5 colunas. "Tempo assistido" mostra "12 h 30 min" ("45 min" abaixo de 1 h, "12 h" quando os minutos são zero) |
| `SeeAllLink` | "Ver tudo ›" na `action` do `SectionHeader` | magenta (`text-sidebar-primary`), seta `chevronForward`, hover em pílula (`rounded-full`, fundo `bg-sidebar-primary/15`, igual ao item do cabeçalho; a cor do texto não muda), `ariaLabel` por seção |
| `EmptyState` | lista vazia | cartão tracejado (`rounded-card border-dashed`) centralizado: ilustração opcional (`icon`, ex.: `illustrations/empty-tv`, TV fora do ar com chuvisco que pisca (`.tv-static-cell` em `globals.css`, para com `prefers-reduced-motion`); é a ilustração padrão dos estados vazios, `size-28`), título em negrito (`title`), descrição `muted` (`description`) e botão do próximo passo |
| `StarRating` | nota em meias estrelas | tamanhos `xs/sm/md/lg`; `sm` cinza (média), `lg` para sheet; radio group acessível |
| `RatingAverage`, `TmdbRating` | médias | apoio, sem competir com a nota do usuário |
| `BackLink` | voltar (#150) | só nas telas de detalhe e de texto, colocado pela própria página como primeiro item (título e busca → `/descobrir`; configurações → perfil próprio; entrar, sobre, termos, privacidade, em breve → `/`). As telas raiz da navegação (Seguintes, Descobrir, Biblioteca, Perfil), a landing e o cadastro não têm. Volta à tela anterior só se ela for do Flomo (`navigation.canGoBack`, Navigation API); senão, ou sem a API, segue o `fallbackHref` (a tela-pai). Link de verdade, funciona sem JS |
| `Icon` | ícones | Ionicons v8 copiados como dados; `filled` = ativo; tamanho por `size-*` |
| `ProseBlock`, `RoadmapList`, `ContactInfo` | páginas de texto | |
| `SearchCombobox` | campo de busca com sugestões (cabeçalho no desktop, `SearchForm` no celular) | `rounded-full`, ícone de lupa à esquerda. Com texto, um "x" (`close`) à direita apaga tudo e devolve o foco ao campo: `size-8` (44px no toque), cinza, hover `bg-muted`; o "x" nativo do `type="search"` fica escondido |
| Shell: `SiteHeader`, `NavLink`, `BottomNav`, `HeaderSearch`, `SiteFooter`, `UserMenu` | navegação | pílula magenta no ativo; barra inferior com ícone preenchido + rótulo |
| `UserMenu` (menu da foto) + `SiteInfoMenuItems` | menu da conta | celular: botão de 44px (`size-11`, a foto segue com 32px), itens com 44px (`max-md:min-h-11`), menu `w-72` (máx. largura da tela menos 1rem), sem folga nas bordas e itens sem cantos, para a linha inteira ser clicável; aviso do TMDB em `text-[11px]`; camada do desfoque em GPU (`before:transform-gpu`) para o fundo não piscar ao passar o mouse nos itens; "Sair" em `text-destructive`, largura total; no fim, os links do rodapé e o aviso do TMDB (`md:hidden`), porque no celular logado o rodapé some (`body:has([data-bottom-nav]) > footer` em `globals.css`). `SiteInfoMenuItems` também é o conteúdo do menu "···" da landing |
| Landing: `LandingMenu`, `PosterWall` | landing do visitante | mosaico alinhado, um ponto de luz, aviso TMDB dentro do menu "···" |

Fora de `components/` mas de uso compartilhado nas telas de biblioteca: `following-list` (Seguintes; o card inteiro é o link do título, estendido por `after:absolute after:inset-0`, e o check fica acima com `z-10`), `library-card`, `watch-control` e `quick-mark` (check em círculo `size-11 rounded-full`, mesmo botão em Seguintes e no episódio), `status-control`, `rating-control`.

### Pendências do desenho (PR 3) ainda sem componente
`ProgressBar` com rótulo (S2:E4 · 9 de 16; hoje só o cartão da Biblioteca tem barra, estreito demais para rótulo ao lado) e `StatCard` (números do perfil; hoje são marcação local do perfil, sem componente). Só nascem com o 2º uso. Visual do SegmentedControl no desenho: pílula ativa em magenta sobre trilha cinza; padronizado em #122.

### Inventário #123 (desenho PR 3 × código)
- **Já igual**: `PosterCard` (pôster 2:3 `rounded-poster`, título 2 linhas), `PosterRow` (`rounded-card`, 12px de padding), barra `h-1` (4px) magenta, `SectionHeader` com títulos maiores no Descobrir.
- **Ajustes de propósito que viram padrão (mantidos)**: ranking em degradê no lugar da bolinha numerada do desenho; check em círculo dos episódios; largura da página `60rem`; cantos do card de episódio; título de seção `lg` e espaço entre seções do Descobrir; peso da aba do cabeçalho (#109/#110, `nav-link-style`); cursor de mão global (#118).
- **Alinhado ao desenho nesta rodada**: "Ver tudo ›" magenta com seta (era cinza, sem seta); `EmptyState` em cartão tracejado centralizado (era texto solto); `Skeleton` como primitivo.
- **Feito em #122**: visual do `SegmentedControl` e a aba Para assistir / Em breve de `/seguintes` (agora `SegmentedControl`).

## 3. Padrões de tela
- **Feedback de ação** (#148): sucesso de salvar aparece como aviso verde (`toast.success`, ver `Toaster`: canto inferior direito no desktop, alto no celular), com o texto do `next-intl`; o botão mostra "Salvando..." enquanto a ação roda e só fica habilitado quando algum campo difere do que está gravado (comparando como o servidor grava: sem espaços nas pontas e, no handle, em minúsculas). Erro continua no próprio formulário, perto do campo, com `role="alert"` e `text-destructive`. Hoje em Configurações (perfil e nome de usuário). Ação rápida e repetível, como o check do Seguintes (#149), **não** mostra aviso no canto (marcar vários em sequência empilharia avisos): a linha fica no mesmo lugar desde o clique; enquanto carrega, o círculo fica magenta (`default`) com um anel aberto girando (`motion-safe:animate-spin`; parado com `prefers-reduced-motion`); só quando o carregamento termina (ação respondida e lista nova aplicada) aparece o check magenta preenchido, por 0,6 s, e então a linha dá lugar ao próximo item (que pode subir para o topo) ou some; e o que foi marcado ("Série T2:E3 marcado como assistido.") é anunciado só ao leitor de tela (`role="status"` `sr-only` na lista, não no botão, que some com a linha). Ainda não na página do título (`WatchControl`), onde o check fica preenchido depois de marcar.
- **Filtros**: o filtro de tipo, sempre na ordem Todos, Séries, Filmes ("Todos", não "Tudo"/"Ambos"), fica na mesma linha dos outros filtros, alinhado à direita (`flex flex-wrap justify-between`), como na Biblioteca, em Seguintes e no "Em alta no serviço".
- **Seguintes**: lista em 2 colunas (desktop), etiqueta `T2:E4` + nome do episódio, sem subtítulo.
- **Descobrir**: prateleiras (Em alta com ranking, Nos cinemas, Em alta no serviço) em `Shelf`. Em "Em alta no serviço", o serviço é um `Select` no próprio título ("Em alta na Netflix ▾", artigo conforme o gênero do serviço; só o nome é o seletor: botão em pílula magenta (`bg-primary`) com texto branco, na fonte do título, mais alto que a linha, 44px no toque, `aria-label` "Serviço de streaming") e o tipo (Todos/Séries/Filmes) é um `SegmentedControl` sozinho à direita, na mesma linha do título (`SectionHeader` com `wrap`: no celular desce para a linha de baixo). Abrir o `Select` pré-carrega os outros serviços.
- **Landing**: tela cheia, sem cabeçalho/rodapé do app; "Entrar" e "···" com 36px.
- **Listas**: cartões `rounded-card border`, hover `bg-muted/50`.
- **Ver mais** (Seguintes): a lista mostra 5 itens no celular (uma coluna) e 10 no desktop (duas colunas de 5). O item seguinte (celular) ou a linha seguinte (desktop) aparece esmaecida (`opacity-40`, sem clique nem hover), com o botão "Ver mais" em magenta (`Button` `default`, `rounded-full`, `shadow-lg`) por cima: centrado no item no celular, centrado entre as duas colunas no desktop. Cada "Ver mais" acrescenta mais uma página (5 / 10); trocar o filtro volta ao início. Celular e desktop se resolvem só com CSS (`max-md:` / `md:`), sem detectar a tela por JavaScript.
- **Texto longo** (#139): nada pode passar da tela em 320px. Texto de usuário ou do catálogo leva `break-words` (palavra única sem espaço); título de cartão usa `line-clamp-2` + `break-words`; linha única (episódio, handle, rótulo de menu) usa `truncate` com pai `min-w-0`. Em grid de coluna única, `grid-cols-[minmax(0,1fr)]` (a coluna `auto` cresce até o `nowrap`); em flex, `min-w-0` no filho. Já embutido em `PosterCard`, `PosterRow` e `LibraryRow`: reutilizar em vez de repetir classes.
- **Prefixo dentro do campo** (handle, #162): o "@" fica dentro do `Input`, fixo e não editável (`span` `aria-hidden` absoluto, `pointer-events-none`, `text-muted-foreground`; campo com `pl-7`). O valor enviado não inclui o "@".
- **Mensagens de erro**: `role="alert"`, `text-sm text-destructive`.

## 4. Convenções
- Reutilizar antes de criar (AGENTS.md, "UI componentization"): shadcn, depois `src/components/`. Um componente por arquivo, agrupado por domínio.
- Só vira componente o que aparece em 2+ telas.
- Cursor de mão é global (`globals.css`): botões, abas, itens de menu/opção, checkbox/radio/switch e `summary`, exceto desabilitados (`disabled`, `aria-disabled="true"`, `data-disabled`), que ficam com o cursor padrão. Itens de `dropdown-menu`/`select` e `checkbox`/`radio` trazem `cursor-pointer` no próprio componente; não repetir `cursor-pointer` nas telas.
- Acessibilidade: foco visível (ring), `aria-current` no item ativo, `sr-only` em ícones sem texto, alvos de 44px no toque.
- Mockups partem do app real e se comparam pixel a pixel com o aprovado; medir antes de codar.


## Carregamento (#170)

- Nada de `…` solto nem de `Suspense` sem fallback em tela: o fallback é um esqueleto dentro de `LoadingRegion`, com a altura próxima da final.
- Dentro da tela, cada `Suspense` usa o esqueleto do seu bloco. Na navegação entre rotas, `loading.tsx` mostra `RouteProgress` + um esqueleto genérico (`(publico)`, `configuracoes`).
- Botão de ação mantém o texto curto ("Salvando...") e o mesmo tamanho.
- Movimento: `motion-safe:animate-pulse` no `Skeleton`; a barra do topo para com `prefers-reduced-motion`.
- Ainda com `fallback={null}` de propósito: botões e médias pequenos do cabeçalho do título (status, nota, onde assistir), comentários e a landing, que não reservam altura relevante.
