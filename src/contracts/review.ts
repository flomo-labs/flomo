// Review: texto do usuário sobre um título (várias por usuário e título).
// O limite vale aqui e no CHECK da tabela `reviews`: mudar um exige mudar o
// outro (no banco, por uma migration nova).
export const REVIEW_MAX_LENGTH = 5000;

// Situação de moderação. Só a plataforma muda; o autor não (trigger da
// migration 0009).
export const MODERATION_STATUSES = ["published", "hidden", "removed"] as const;

export type ModerationStatus = (typeof MODERATION_STATUSES)[number];
