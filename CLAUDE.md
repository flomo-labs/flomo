@AGENTS.md

# Verification

- Before saying you're done: `pnpm lint`, `pnpm typecheck`, `pnpm test`. `pnpm build` only before opening a PR.
- While iterating, run only the file's test: `pnpm test path/to/file`.
- To run everything and get only failures, use the `verificador` subagent. Before opening a PR, use `/pr-pronto`.

# Secrets

- Never read or ask for `.env.local`. New variables go in `.env.example` first.
- The repo is public: no secrets, corporate emails or local machine paths.

# Compaction

Keep the list of changed files, verification commands and decisions made.
