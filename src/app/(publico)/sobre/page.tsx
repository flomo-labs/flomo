import type { Metadata } from "next";
import Link from "next/link";
import { Prose, ProseSection } from "@/components/prose";

export const metadata: Metadata = {
  title: "Sobre · Flomo",
  description: "O que é o Flomo e de onde vêm os dados de filmes e séries.",
};

export default function SobrePage() {
  return (
    <Prose>
      <h1 className="text-3xl font-bold">Sobre o Flomo</h1>
      <div className="flex flex-col gap-3">
        <p>
          O Flomo é um lugar para acompanhar filmes e séries, saber qual é o
          próximo episódio, avaliar o que você assistiu e trocar ideias com
          amigos.
        </p>
        <p>
          Hoje o projeto está em fase de testes, é de uso não comercial e é
          aberto apenas a maiores de 18 anos. Veja o que vem pela frente em{" "}
          <Link href="/em-breve">Em breve</Link>.
        </p>
      </div>
      <ProseSection title="Créditos">
        <p>
          Os dados e as imagens de filmes e séries vêm do{" "}
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            TMDB
          </a>
          .
        </p>
        <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
          This product uses the TMDB API but is not endorsed or certified by
          TMDB.
        </p>
      </ProseSection>
    </Prose>
  );
}
