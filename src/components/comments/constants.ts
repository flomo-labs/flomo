// Comentários por página: a primeira (lida no servidor, no título) e cada
// "Carregar mais". Fica fora de `comment-list.tsx` para o servidor poder
// importar o valor (de um arquivo "use client" ele só receberia uma
// referência).
export const COMMENT_PAGE_SIZE = 10;
