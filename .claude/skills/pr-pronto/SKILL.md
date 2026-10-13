---
name: pr-pronto
description: Confere a branch atual antes de abrir PR (verificação, dados sensíveis, nome do produto) e sugere commits e texto do PR.
disable-model-invocation: true
---

Prepare a branch atual para PR, sem fazer push nem abrir o PR.

1. Use o subagente `verificador`. Se algo falhar, pare e mostre as falhas.
2. Veja o diff contra a `main` (`git --no-pager diff origin/main...HEAD`). O repositório é público: procure segredo, chave, e-mail pessoal ou corporativo, caminho absoluto de máquina (por exemplo `C:\Users`), link privado e qualquer trecho copiado de arquivos "UpNext". Liste o que achar.
3. Confira `git grep -n -i "upnext"` nos arquivos alterados: ocorrências novas devem virar "Flomo" (veja as exceções no `AGENTS.md`).
4. Confira se os commits seguem Conventional Commits em português e se cada um tem um propósito só.
5. Escreva o texto do PR seguindo `.github/pull_request_template.md`.
6. Termine dizendo o que ainda falta e lembrando que o outro dev precisa revisar (o autor não aprova o próprio PR).
