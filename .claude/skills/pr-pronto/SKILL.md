---
name: pr-pronto
description: Confere a branch atual antes de abrir PR (verificação, dados sensíveis, nome do produto) e sugere commits e texto do PR.
disable-model-invocation: true
---

Prepare the current branch for a PR; do not push or open it.

1. Run the `verificador` subagent. On failure, stop and show the failures.
2. Review `git --no-pager diff origin/main...HEAD`. The repo is public: look for secrets, keys, personal/corporate emails, absolute machine paths (e.g. `C:\Users`), private links, text copied from "UpNext" files. List findings.
3. `git grep -n -i "upnext"` on changed files: new occurrences become "Flomo" (exceptions in `AGENTS.md`).
4. Check commits follow Conventional Commits in Portuguese, one purpose each.
5. Write the PR text following `.github/pull_request_template.md`.
6. End with what's still missing and a reminder that the other dev must review (authors don't approve their own PR).
