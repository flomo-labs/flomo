## Product name: Flomo (never "UpNext")

The product is **Flomo** (old name UpNext was dropped, see `docs/adr/ADR-002-renomeacao-upnext-para-flomo.md`). Repo: `flomo-labs/flomo`.

- All new code, UI text, docs, tests, commits and PR text say only "Flomo".
- Migration is gradual: when editing a file that still has `UpNext`/`upnext`/`UPNEXT`, rename every occurrence in that file in the same PR. No bulk-rename PRs. Never assume "UpNext" is correct because a file uses it.
- Keep "Up Next"/"UpNext" only for (1) the competitor Up Next TV (upnexttv.app) and brand-conflict discussion, (2) historical text (timeline, accepted ADRs; at most add "(hoje Flomo)"), (3) git history.
- If a rename touches anything outside the repo (env var, Vercel/Supabase project, OAuth redirect), list what must be updated in the PR.
- Find leftovers: `git grep -n -i "upnext" -- . ":!pnpm-lock.yaml"`.

## Business rules

Read `docs/regras-de-negocio.md` before implementing or changing a rule. Record new/changed rules there in the same PR, after the evaluation described at the top of that file (repo is public: no strategy, protection values or personal data).

## Layers and imports (ADR-001, enforced by `eslint.config.mjs`)

- `src/domain/`: pure TypeScript (denylist). No `next`, `react`, `drizzle-orm`, `@supabase/*`, nor `infra/`, `app/`, `components/`, `lib/`. DB and external services come in through interfaces (ports) implemented in `infra/`. Other pure libs are fine.
- `src/contracts/`: allowlist. Only `zod`, other `contracts/` files, relative paths.
- `src/infra/` may import `domain/`. `src/app/` may import `domain/`, `infra/`, `contracts/`.

New dependency in `contracts/`: never `eslint-disable`, never move code elsewhere to dodge the rule. First ask: does it run on Node, browser and React Native? If not, it doesn't belong there. If yes, add a lookahead `(?!package-name(/|$))` to the `regex` of the `contracts/` block in `eslint.config.mjs`, justify it in the PR, and confirm the rule still blocks others (temp file in `src/contracts/` importing another package must fail `pnpm lint`).

## SQL injection

Queries only via Drizzle's `sql\`...\`` template or query builder. ESLint blocks `sql.raw`, `.unsafe()` and hand-built `execute()` outside `src/infra/db/schema/` and tests; no `eslint-disable`. Dynamic table/column names: `sql.identifier`.

## UI componentization

Before coding a new or changed screen, check which elements (list, card, standard button, dialog, block) already exist elsewhere or will appear in more than one screen. Those become components; single-use stays in the screen. No speculative abstractions.

- Reuse first: shadcn in `src/components/ui/`, then project components in `src/components/`. Create new only if none fits.
- One component per file, clear name, grouped by domain (e.g. `catalog/`), no duplicated markup across screens. Example: the Seguintes list is one component used on Home and `/seguintes`.
- PR: one line on what was componentized/reused and what was left out.

## Git and PRs

- Never push to `main`; everything goes through a PR with green CI. Branch: `type/short-desc` (`feat/`, `fix/`, `chore/`, `docs/`).
- Commits: Conventional Commits in Portuguese (`feat:`, `fix:`, `chore:`, `docs:`, `ci:`, `test:`, optional scope), one purpose each, no "wip"/duplicates (they land on `main`).
- Merge strategy: "Create a merge commit". Never squash or rebase to merge.
- Update a branch with `git merge origin/main`, not rebase; rebase only on never-pushed local branches. Never `git push --force` on shared branches or `main`.
- Small focused PRs using `.github/pull_request_template.md`.
- Before starting a task or branch: `git fetch origin` and check whether `main` changed.
- Personal config (model, permissions, git identity) goes in `.claude/settings.local.json` and `CLAUDE.local.md` (unversioned). Changes to `.claude/`, `eslint.config.mjs`, `AGENTS.md`, `CLAUDE.md` affect both devs: own PR.

### Migrations

- Schema change: `pnpm db:generate`, review the SQL, then `pnpm db:migrate`. Never edit an applied migration.
- Migration PR is separate from the code using it, and must be compatible with the code in production (add before remove/rename; `drop`/`rename` only once no code uses the column).
- `flomo-prod`: workflow **Migrations (produção)** applies it on merge touching `drizzle/`. Each dev's `flomo-dev` is manual (`pnpm db:migrate`); a reviewer of a migration PR runs `pnpm db:migrate` and `pnpm test:integration` on their own `flomo-dev`.
- Two branches generating migrations collide in numbering and `drizzle/meta` journal: warn your pair before touching `drizzle/`; whoever comes later does `git merge origin/main`, deletes their migration (`.sql`, snapshot, journal entry) and reruns `pnpm db:generate`.
- `security definer` functions, `flomo_app` grants and RLS changes need the other dev as reviewer.

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
