@AGENTS.md

# Verificação

- Antes de dizer que terminou: `pnpm lint`, `pnpm typecheck` e `pnpm test`. O `pnpm build` só antes de abrir PR.
- Enquanto itera, rode só o teste do arquivo: `pnpm test caminho/do/arquivo`.
- Para rodar tudo e receber só as falhas, use o subagente `verificador`.
- Antes de abrir PR, use `/pr-pronto`.

# Segredos

- Nunca leia nem peça `.env.local`. Variáveis novas entram primeiro no `.env.example`.
- O repositório é público: nada de segredo, e-mail corporativo ou caminho local de máquina.

# Compactação

Ao compactar, preserve a lista de arquivos alterados, os comandos de verificação e as decisões tomadas.
