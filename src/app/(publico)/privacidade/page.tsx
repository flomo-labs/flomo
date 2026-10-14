import type { Metadata } from "next";
import { ContactInfo } from "@/components/contact-info";
import { Prose, ProseSection } from "@/components/prose";
import { LEGAL_UPDATED_AT } from "@/content/legal";

export const metadata: Metadata = {
  title: "Política de privacidade · Flomo",
  description:
    "Quais dados o Flomo coleta, para quê e quais são os seus direitos.",
};

export default function PrivacidadePage() {
  return (
    <Prose>
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">Política de privacidade</h1>
        <p className="text-sm text-muted-foreground">
          Última atualização: {LEGAL_UPDATED_AT}
        </p>
      </div>

      <p>
        Esta política explica como o Flomo trata os seus dados pessoais, em
        linha com a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018). O
        Flomo está em fase de testes, é de uso não comercial e é aberto apenas a
        maiores de 18 anos.
      </p>

      <ProseSection title="Quais dados coletamos">
        <ul>
          <li>
            <strong>Da sua conta Google</strong>, quando você entra: nome,
            e-mail e foto. O e-mail serve para identificar a conta e não é
            exibido a outros usuários.
          </li>
          <li>
            <strong>Do seu perfil</strong>: nome de usuário (@handle), nome de
            exibição, país, fuso horário, idioma e se o perfil é público ou
            privado.
          </li>
          <li>
            <strong>Do que você faz no Flomo</strong>, à medida que as funções
            forem sendo lançadas: títulos que você acompanha, episódios
            marcados, notas e reviews.
          </li>
        </ul>
        <p>
          Não pedimos documentos, localização, contatos nem dados sensíveis.
        </p>
      </ProseSection>

      <ProseSection title="Para que usamos">
        <p>
          Para criar e manter a sua conta, mostrar o seu perfil e a sua
          biblioteca, e fazer o produto funcionar. A base legal é a execução do
          serviço que você pediu ao criar a conta e, quando for o caso, o seu
          consentimento. Não vendemos nem compartilhamos seus dados para
          publicidade.
        </p>
      </ProseSection>

      <ProseSection title="Cookies">
        <p>
          Usamos um único cookie, o de sessão, necessário para manter você
          conectado. Não usamos cookies de rastreamento, publicidade nem
          estatísticas de uso, por isso não exibimos aviso de cookies.
        </p>
      </ProseSection>

      <ProseSection title="Com quem os dados passam">
        <p>
          Para funcionar, usamos serviços que processam dados em nosso nome:
        </p>
        <ul>
          <li>Google, para o login;</li>
          <li>
            Supabase, para o banco de dados e a autenticação (região do Brasil);
          </li>
          <li>uma plataforma de hospedagem, para servir o site.</li>
        </ul>
        <p>
          Os dados de filmes e séries vêm do TMDB, que é consultado pelo nosso
          servidor e não recebe dados dos usuários. Se passarmos a usar outros
          serviços que tratem dados pessoais, atualizaremos esta política antes.
        </p>
      </ProseSection>

      <ProseSection title="Por quanto tempo guardamos">
        <p>
          Enquanto a sua conta existir. Ao excluir a conta, os seus dados são
          apagados. Podemos guardar por mais tempo apenas o que a lei exigir,
          como registros de acesso (6 meses, conforme o Marco Civil da
          Internet).
        </p>
      </ProseSection>

      <ProseSection title="Seus direitos">
        <p>
          Você pode pedir a confirmação de que tratamos seus dados, acesso,
          correção, portabilidade, exclusão e informações sobre o
          compartilhamento, além de revogar um consentimento. Alguns pedidos
          ainda são atendidos por contato direto, porque a exclusão e a
          exportação pelo próprio app ainda estão sendo construídas.
        </p>
        <p>
          Para exercer seus direitos ou tirar dúvidas, fale com a gente em{" "}
          <ContactInfo />. Você também pode reclamar à Autoridade Nacional de
          Proteção de Dados (ANPD).
        </p>
      </ProseSection>

      <ProseSection title="Mudanças nesta política">
        <p>
          Se algo mudar de forma relevante, atualizaremos a data no topo e
          avisaremos no app.
        </p>
      </ProseSection>
    </Prose>
  );
}
