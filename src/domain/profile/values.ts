// Tela em que o usuário quer começar ao entrar: a Home ou a fila Seguintes.
export const START_SCREENS = ["home", "following"] as const;
export type StartScreen = (typeof START_SCREENS)[number];
