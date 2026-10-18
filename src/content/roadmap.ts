// Itens da página /em-breve, na ordem de implementação: o que sai antes vem
// primeiro. Mantenha em dia: ao entregar uma funcionalidade, remova o item (ou
// mova para o que já existe); ao planejar uma nova, acrescente na posição certa.
// Só o que pode ser público: sem datas, preços nem estratégia (ver a avaliação
// em docs/regras-de-negocio.md).

export type RoadmapStatus = "planned" | "exploring";

export type RoadmapItem = {
  id: string;
  title: string;
  description: string;
  status: RoadmapStatus;
};

export const ROADMAP_STATUS_LABEL: Record<RoadmapStatus, string> = {
  planned: "Planejado",
  exploring: "Em estudo",
};

export const roadmap: readonly RoadmapItem[] = [
  {
    id: "comentarios-e-curtidas",
    title: "Comentários e curtidas",
    description:
      "Veja e curta os comentários de outras pessoas, e comente também em temporadas e episódios.",
    status: "planned",
  },
  {
    id: "listas-avancadas",
    title: "Listas avançadas",
    description:
      "Listas temáticas, colaborativas e compartilháveis, além das listas simples.",
    status: "planned",
  },
  {
    id: "explorar",
    title: "Explorar",
    description:
      "Descubra o que assistir a seguir com base no que está em alta e no que está nos seus serviços de streaming.",
    status: "planned",
  },
  {
    id: "stats-avancadas",
    title: "Estatísticas avançadas",
    description:
      "Tempo assistido, ritmo, gêneros favoritos e como o seu gosto evolui ao longo do tempo.",
    status: "planned",
  },
  {
    id: "recomendacoes",
    title: "Recomendações",
    description:
      "Sugestões a partir do que você assistiu e do que seus amigos estão vendo.",
    status: "planned",
  },
  {
    id: "wrapped",
    title: "Resumo do ano",
    description: "Um retrospecto do que você assistiu e avaliou em cada ano.",
    status: "planned",
  },
  {
    id: "gamificacao",
    title: "Conquistas",
    description:
      "Marcos e conquistas pelo que você assiste, avalia e compartilha.",
    status: "exploring",
  },
  {
    id: "noticias",
    title: "Notícias",
    description: "Novidades sobre os títulos que você acompanha.",
    status: "exploring",
  },
  {
    id: "comunidades",
    title: "Comunidades",
    description:
      "Espaços para conversar sobre uma série, um gênero ou um fandom.",
    status: "exploring",
  },
  {
    id: "escolha-em-grupo",
    title: "Escolha em grupo",
    description:
      "Ajuda para decidir o que assistir quando tem mais gente no sofá.",
    status: "exploring",
  },
  {
    id: "jogos",
    title: "Jogos",
    description: "Desafios e jogos entre amigos usando o catálogo de títulos.",
    status: "exploring",
  },
  {
    id: "importacao",
    title: "Importar de outros apps",
    description:
      "Traga o seu histórico do Trakt e do TV Time para não recomeçar do zero.",
    status: "exploring",
  },
  {
    id: "apps-nativos",
    title: "Aplicativos para celular",
    description: "Flomo no iOS e no Android, com a mesma conta da versão web.",
    status: "exploring",
  },
];
