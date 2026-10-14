import type { Metadata } from "next";
import Link from "next/link";
import { ContactInfo } from "@/components/contact-info";
import { Prose, ProseSection } from "@/components/prose";
import { LEGAL_UPDATED_AT } from "@/content/legal";

export const metadata: Metadata = {
  title: "Termos de uso · Flomo",
  description: "As regras para usar o Flomo.",
};

export default function TermosPage() {
  return (
    <Prose>
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">Termos de uso</h1>
        <p className="text-sm text-muted-foreground">
          Última atualização: {LEGAL_UPDATED_AT}
        </p>
      </div>

      <p>
        Ao criar uma conta ou usar o Flomo, você concorda com estes termos. Se
        não concordar, não use o serviço.
      </p>

      <ProseSection title="Quem pode usar">
        <p>
          O Flomo está em fase de testes e só pode ser usado por pessoas com 18
          anos ou mais. Ao entrar, você declara ter essa idade. Podemos encerrar
          contas que não cumpram essa regra.
        </p>
      </ProseSection>

      <ProseSection title="Sua conta">
        <p>
          O acesso é feito com a sua conta Google. Você é responsável pelo que
          acontece na sua conta e deve nos avisar se achar que ela foi usada por
          outra pessoa.
        </p>
      </ProseSection>

      <ProseSection title="O que você publica">
        <p>
          Notas, reviews e outros conteúdos continuam sendo seus. Ao
          publicá-los, você nos autoriza a exibi-los no Flomo, conforme a
          visibilidade que escolher. Publique apenas o que você tem direito de
          publicar.
        </p>
        <p>É proibido publicar conteúdo que:</p>
        <ul>
          <li>seja ilegal, ofensivo, discriminatório ou de assédio;</li>
          <li>exponha dados pessoais de terceiros;</li>
          <li>seja spam ou tente enganar outras pessoas.</li>
        </ul>
        <p>
          Podemos ocultar ou remover conteúdo que descumpra estes termos e
          suspender ou encerrar contas, avisando você sempre que possível.
        </p>
      </ProseSection>

      <ProseSection title="Dados de filmes e séries">
        <p>
          As informações e imagens de filmes e séries pertencem a seus
          respectivos titulares e vêm do TMDB (veja{" "}
          <Link href="/sobre">Sobre</Link>
          ). Você não deve copiá-las em massa nem redistribuí-las.
        </p>
      </ProseSection>

      <ProseSection title="Fase de testes">
        <p>
          O serviço é oferecido como está, sem garantia de disponibilidade, e
          pode mudar, ficar fora do ar ou ser encerrado. Dados da fase de testes
          podem ser apagados. Não nos responsabilizamos por perdas que a lei não
          nos obrigue a assumir.
        </p>
      </ProseSection>

      <ProseSection title="Privacidade">
        <p>
          O tratamento dos seus dados está descrito na{" "}
          <Link href="/privacidade">política de privacidade</Link>.
        </p>
      </ProseSection>

      <ProseSection title="Mudanças e contato">
        <p>
          Podemos atualizar estes termos; a data no topo mostra a versão em
          vigor, e mudanças relevantes serão avisadas no app. Estes termos
          seguem a lei brasileira. Dúvidas: <ContactInfo />.
        </p>
      </ProseSection>
    </Prose>
  );
}
