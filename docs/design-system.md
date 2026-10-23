# Design system do Flomo

Referência do visual real do app (direção A, Fase 1.8), extraída do código. Fonte dos tokens: `src/app/globals.css`. Desenho aprovado dos componentes compartilhados: `design/1.8-opcoes/componentes/pr3-componentes.png` (fica no Project, não no repo).

**Regra de ouro:** ajustes visuais específicos feitos no código fazem parte do padrão, não são desvios. Ao padronizar (#122, #123), inventarie primeiro, preserve o que foi ajustado de propósito e atualize este arquivo. Mudou um padrão? Atualize aqui no mesmo PR.

**Camadas:** tokens em `globals.css` → primitivos shadcn em `src/components/ui/` → componentes do projeto em `src/components/` (por domínio: `catalog/`, `shell/`, `landing/`) → telas em `src/app/`. Nada de cor, raio ou largura fixos em tela: use o token. Trocar de direção visual depois mexe só nos tokens e nos primitivos.

## 1. Fundamentos

- Tema único: **escuro** (`<html class="dark">`). O tema claro existe nos tokens (shadcn) mas não é usado. Estilo shadcn `base-nova`, base `neutral`, ícones próprios (ver 4).
- Cor de acento: **magenta** (matiz ~4 em oklch), vinda do preset.

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
Tokens do app: `rounded-poster` (12px, pôsteres) e `rounded-card` (16px, cartões e linhas). Botões e campos `rounded-lg`; diálogos `rounded-xl`; **filtros, abas e etiquetas `rounded-full`**; bottom sheet `rounded-t-2xl`. **Raios concêntricos:** o raio de um elemento dentro de outro = raio externo − espaço entre eles (ex.: chuvisco da `EmptyTv`: borda 8, traço 3, folga 2,5 → tela 4).

### Sombras e profundidade
Quase sem sombra: profundidade vem de borda (`border-border`) e `ring-1 ring-foreground/10` (diálogo). Exceções: aba ativa `shadow-sm`; menu "···" da landing com sombra forte própria (`.landing-menu`). Overlay de diálogo: `bg-black/10` + `backdrop-blur-xs`.

### Layout
- `page-container`: coluna centrada, máx. `--container-page` (**60rem**), margem lateral 16px (celular) e 32px (≥768px). Textos longos: `max-w-reading` (**48rem**).
- Breakpoints: `sm` 640, `md` 768 (corte celular/desktop do shell).
- Cabeçalho: `h-16`, borda inferior. Barra inferior do celular: `h-16` + `safe-area-inset-bottom`, só logado; o `body` reserva o espaço (`[data-bottom-nav]`).
- Alvos de toque: com `pointer-coarse`, botões, abas e ícones sobem para **44px** (`h-11`/`size-11`); abas, 50px de lista.
- Movimento: respeitar `prefers-reduced-motion` (onda dos pôsteres da landing e chuvisco da TV vazia param).

## 2. Componentes

### Primitivos (`src/components/ui/`, shadcn + Base UI)
- **Button**: variantes `default` (magenta), `outline`, `secondary`, `ghost`, `destructive` (translúcido), `link`. Tamanhos: `xs` 24, `sm` 28, `default` 32, `lg` 36, `icon`/`icon-xs/sm/lg`. No toque vira 44px. Botão de ação em pílula: `className="rounded-full"` (padrão em Biblioteca e Título). Ícone dentro: `data-icon="inline-start|inline-end"`.
- **Badge**: pílula `h-5`, variantes `default`, `secondary`, `destructive`, `outline`, `ghost`, `link`.
- **Input / Textarea / Checkbox / RadioGroup / Label**: altura 32, `rounded-lg`, borda `input`, fundo `input/30`, foco com ring 3px, erro via `aria-invalid`.
- **Tabs**: lista `bg-muted` com `p-[3px]`, altura 32 (50 no toque), gatilho ativo `bg-background` + `shadow-sm` (escuro: `input/30`); variante `line` com sublinhado.
- **Dialog**: `rounded-xl bg-popover`, `max-w-sm`, botão de fechar fantasma redondo. `sheet` = **bottom sheet no celular** (abaixo de `sm`: colado na base, largura total, `rounded-t-2xl`, respeita a área segura, desliza de baixo) e centralizado de `sm` para cima (#115). Rodapé: botões empilhados no celular, em linha no desktop.
- **Skeleton**: bloco `animate-pulse bg-muted rounded-lg`; o formato vem do `className` (usado em `ShelfSkeleton`).
- **DropdownMenu, Tooltip, Avatar, Progress (barra `h-1` `rounded-full`, preenchimento `primary`), Separator**.

### Compartilhados (`src/components/`)
| Componente | Para quê | Detalhes |
|---|---|---|
| `Poster` | pôster TMDB | 2:3, `rounded-poster`, `bg-muted` sem imagem |
| `PosterCard` | cartão de grade | pôster + título 2 linhas + complemento; hover `opacity-80` |
| `PosterRow` | linha de título | pôster 64/80px (`md`) ou 48/56px (`sm`), `rounded-card border p-3`, ação à direita (`trailing`) |
| `Shelf` / `ShelfSkeleton` | prateleira do Descobrir | grade 3 colunas (celular) / 5 (`sm+`); `ranked` = número em degradê (`-ml-5`) sobre escurecimento; esqueleto `animate-pulse` |
| `SegmentedControl` | filtro em pílula (Biblioteca, Seguintes) | uma opção ativa; estado fica na tela |
| `SectionHeader` | título de seção + ação ("Ver tudo") | `size` `default` (`text-section-title`) ou `lg` (`text-section-title-lg`, Descobrir) |
| `SeeAllLink` | "Ver tudo ›" na `action` do `SectionHeader` | magenta (`text-sidebar-primary`), seta `chevronForward`, hover em pílula (`rounded-full`, fundo `bg-sidebar-primary/15`, igual ao item do cabeçalho; a cor do texto não muda), `ariaLabel` por seção |
| `EmptyState` | lista vazia | cartão tracejado (`rounded-card border-dashed`) centralizado: ilustração opcional (`icon`, ex.: `illustrations/empty-tv`, TV fora do ar com chuvisco que pisca (`.tv-static-cell` em `globals.css`, para com `prefers-reduced-motion`); é a ilustração padrão dos estados vazios, `size-28`), título em negrito (`title`), descrição `muted` (`description`) e botão do próximo passo |
| `StarRating` | nota em meias estrelas | tamanhos `xs/sm/md/lg`; `sm` cinza (média), `lg` para sheet; radio group acessível |
| `RatingAverage`, `TmdbRating` | médias | apoio, sem competir com a nota do usuário |
| `BackLink` / `BackBar` | voltar | só volta dentro do app; fallback por `href` |
| `Icon` | ícones | Ionicons v8 copiados como dados; `filled` = ativo; tamanho por `size-*` |
| `ProseBlock`, `RoadmapList`, `ContactInfo` | páginas de texto | |
| Shell: `SiteHeader`, `NavLink`, `BottomNav`, `HeaderSearch`, `SiteFooter`, `UserMenu` | navegação | pílula magenta no ativo; barra inferior com ícone preenchido + rótulo |
| Landing: `LandingMenu`, `PosterWall` | landing do visitante | mosaico alinhado, um ponto de luz, aviso TMDB dentro do menu "···" |

Fora de `components/` mas de uso compartilhado nas telas de biblioteca: `following-list` (Seguintes), `library-card`, `watch-control` (check em círculo `size-11 rounded-full`), `status-control`, `rating-control`.

### Pendências do desenho (PR 3) ainda sem componente
`ProgressBar` com rótulo (S2:E4 · 9 de 16; hoje só o cartão da Biblioteca tem barra, estreito demais para rótulo ao lado) e `StatCard` (números do perfil; o Perfil ainda não mostra números). Só nascem com o 2º uso. Visual do SegmentedControl no desenho: pílula ativa em magenta sobre trilha cinza; no código a aba ativa ainda é `bg-background` (tema da aba). Padronizar em #122.

### Inventário #123 (desenho PR 3 × código)
- **Já igual**: `PosterCard` (pôster 2:3 `rounded-poster`, título 2 linhas), `PosterRow` (`rounded-card`, 12px de padding), barra `h-1` (4px) magenta, `SectionHeader` com títulos maiores no Descobrir.
- **Ajustes de propósito que viram padrão (mantidos)**: ranking em degradê no lugar da bolinha numerada do desenho; check em círculo dos episódios; largura da página `60rem`; cantos do card de episódio; título de seção `lg` e espaço entre seções do Descobrir; peso da aba do cabeçalho (#109/#110, `nav-link-style`); cursor de mão global (#118).
- **Alinhado ao desenho nesta rodada**: "Ver tudo ›" magenta com seta (era cinza, sem seta); `EmptyState` em cartão tracejado centralizado (era texto solto); `Skeleton` como primitivo.
- **Fica para #122**: visual do `SegmentedControl` e a aba Fila / Em breve de `/seguintes`.

## 3. Padrões de tela
- **Seguintes**: lista em 2 colunas (desktop), etiqueta `T2:E4` + nome do episódio, sem subtítulo.
- **Descobrir**: prateleiras (Em alta com ranking, Nos cinemas, Em alta no serviço) em `Shelf`.
- **Landing**: tela cheia, sem cabeçalho/rodapé do app; "Entrar" e "···" com 36px.
- **Listas**: cartões `rounded-card border`, hover `bg-muted/50`.
- **Mensagens de erro**: `role="alert"`, `text-sm text-destructive`.

## 4. Convenções
- Reutilizar antes de criar (AGENTS.md, "UI componentization"): shadcn, depois `src/components/`. Um componente por arquivo, agrupado por domínio.
- Só vira componente o que aparece em 2+ telas.
- Cursor de mão em botões é global (`globals.css`).
- Acessibilidade: foco visível (ring), `aria-current` no item ativo, `sr-only` em ícones sem texto, alvos de 44px no toque.
- Mockups partem do app real e se comparam pixel a pixel com o aprovado; medir antes de codar.
