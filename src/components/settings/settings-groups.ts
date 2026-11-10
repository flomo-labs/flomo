// Grupos de Configurações (#320): cada um é uma rota própria. A ordem é a da
// coluna do desktop e da lista do celular. Novos grupos entram aqui.
export const SETTINGS_INDEX_PATH = "/configuracoes";

export const SETTINGS_GROUPS = [
  {
    href: "/configuracoes/perfil",
    label: "Perfil",
    description: "Nome, bio, @usuário e perfil privado",
  },
  {
    href: "/configuracoes/conta",
    label: "Conta",
    description: "Formas de entrar, senha e excluir conta",
  },
] as const;
