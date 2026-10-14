# Atribuições de terceiros

## TMDB (The Movie Database)

Dados de catálogo e imagens de filmes e séries vêm da API do [TMDB](https://www.themoviedb.org/).

> This website uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.

Texto exigido pelos [Termos da API](https://www.themoviedb.org/api-terms-of-use) (seção 3); o termo entre colchetes ("website") troca conforme o tipo de produto.

Regras que o Flomo segue:

- O logo do TMDB aparece na página Sobre/Créditos (`primary-short-blue.svg`), e só lá (no rodapé ficaria parecendo que o site é do TMDB), sempre menos destacado que a marca do Flomo e sem alterar cor ou proporção. Os arquivos ficam em `public/tmdb/`.
- A chave da API é usada só no servidor.
- O catálogo não é redistribuído; o cache local guarda só os campos usados, com prazo de expiração (os Termos proíbem manter informação do TMDB em cache por mais de 6 meses).
- A API é gratuita para uso não comercial. Qualquer receita (anúncios, assinaturas) exige licença comercial do TMDB antes.

## TVmaze (previsto)

Quando o calendário de episódios usar o [TVmaze](https://www.tvmaze.com/), os dados dele (licença CC BY-SA 4.0) terão link de crédito e não serão expostos misturados numa API pública do Flomo.

## Código de terceiros

Nenhum trecho de código de terceiros copiado até agora. Se algum for copiado (por exemplo, do MediaTracker, licença MIT), registrar aqui o projeto, a licença e os arquivos afetados.
