# Changelog

Todas as mudanças relevantes do Flomo ficam neste arquivo.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e versões no padrão [SemVer](https://semver.org/lang/pt-BR/).
Como preencher: [docs/versionamento.md](docs/versionamento.md).

## [Não lançado]

### Adicionado

- Marcar a temporada inteira como assistida e marcar no dia da exibição/lançamento, no back (#245).
- Botão "Marcar temporada como vista" na página do título, com progresso, diálogo de data (Hoje, Na data de exibição de cada episódio, Sem data, Escolher data) e "Desfazer"; "No dia em que foi ao ar" e "No dia do lançamento" ao editar a data de episódio e filme (#248).
- Guardar em "Quero ver" um título que ainda não está no catálogo local, a partir de um resultado de busca, numa única operação, no back (#246).
- Botão "+" nas sugestões da busca e "+ Quero ver" nos resultados para guardar o título na biblioteca sem abrir a página dele, com "✓ Na biblioteca" para o que já foi guardado e "Desfazer" no aviso (#234).
- Listas "Em alta" por tipo (todos, séries, filmes) e "Nos cinemas" sem séries, no back (#247).
- Faixa de serviços de streaming e filtro Todos/Séries/Filmes no topo do Descobrir, valendo para as listas; escolher um serviço mostra só "Em alta no serviço" (#252).
- Tag "beta" ao lado da logo e versão do Flomo no rodapé de Configurações (#258).

### Alterado

- Landing com dois caminhos, "Criar conta" e "Já tenho conta · Entrar", que abrem a tela de entrar na aba certa; no celular a landing cabe na tela, sem rolagem. Na tela de entrar, o título, o botão do Google e as abas ("Já tenho conta" / "Sou novo aqui") mudam conforme a situação, com atalho de troca, e criar conta pede "Confirmar senha" (#251).
- A página "Em breve no Flomo" agora se chama "O que vem por aí no Flomo" e ganhou um item no menu da foto (com selo "Novo" enquanto há novidade) e um cartão no fim de Descobrir (#250).
- Novo ícone do Flomo em tema claro e escuro, também ao salvar na tela de início do iPhone (#219, #220).

## [0.9.0] - 2026-10-24

Primeira versão do teste beta (MVP).

### Adicionado

- Entrar com Google e com e-mail e senha, com telas de entrar, criar conta e formas de entrar (#198, #201).
- Catálogo de séries e filmes com busca e página do título com temporadas e episódios.
- Biblioteca com sub-listas por situação, visões por tipo e prévia no perfil (#96, #97, #121).
- Seguintes com próximo episódio, "Ver mais" e marcação com check (#116, #178).
- Descobrir com listas por serviço de streaming, filtro por tipo e Animes (#103, #146, #190).
- Perfil com estatísticas, tempo assistido, notas, avaliações e comentários.
- Excluir a própria conta em Configurações, com senha para quem entra por e-mail (#138, #186, #213).
- Domínio próprio flomo.com.br e e-mail de contato (#172, #179).
- Página "Em breve no Flomo" com o que vem por aí (#216).
- Para quem desenvolve: cabeçalhos de segurança (CSP, HSTS) (#135).

### Alterado

- Visual do app padronizado: botões em pílula, diálogos como bottom sheet no celular, esqueletos de carregamento e barra de progresso nas rotas (#160, #171, #173).
- Tempo assistido no perfil em dias, meses e anos (#188).
- Filtro de tipo vira select no celular (#204).
- Botão Voltar só nas telas de detalhe (#167).

### Corrigido

- Seguintes calcula o próximo episódio uma vez por série (#193).
- Check do Seguintes só aparece quando o carregamento termina (#161, #164, #166).
- Cursor de mão em abas, itens de menu, opções, checkbox e radio (#152).
- Texto longo não estoura mais o layout no celular (#147).
- Filtro do Descobrir rola para o lado no celular quando passa da tela (#196, #197).
- Contorno no botão de fechar dos diálogos (#194).

[Não lançado]: https://github.com/flomo-labs/flomo/compare/v0.9.0...HEAD
[0.9.0]: https://github.com/flomo-labs/flomo/releases/tag/v0.9.0
