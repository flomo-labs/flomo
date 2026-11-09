import type { Metadata } from "next";

// Imagem de preview da marca (1200x630, fundo escuro, símbolo + "Flomo"), usada
// quando um link do Flomo é compartilhado (Instagram, WhatsApp, X etc.).
// Arquivo em `public/`; a URL absoluta vem de `metadataBase`.
export const BRAND_PREVIEW_IMAGE = {
  url: "/og-flomo.png",
  width: 1200,
  height: 630,
  alt: "Flomo",
} as const;

const SHARE_BASE = {
  siteName: "Flomo",
  locale: "pt_BR",
  type: "website",
} as const;

type Env = Record<string, string | undefined>;

// Base das URLs absolutas dos metadados (og:image exige URL absoluta). Em
// produção vale NEXT_PUBLIC_SITE_URL; em preview da Vercel, o endereço do deploy.
export function resolveMetadataBase(env: Env = process.env): URL {
  const site = env.NEXT_PUBLIC_SITE_URL;
  if (site) return new URL(site);
  if (env.VERCEL_URL) return new URL(`https://${env.VERCEL_URL}`);
  return new URL("http://localhost:3000");
}

type Preview = {
  title: string;
  description: string;
  image?: { url: string; alt: string };
};

// openGraph e twitter completos. O Next não herda `openGraph` campo a campo (a
// página que define o seu substitui o do layout), então cada um repete tudo.
// Sem `image`, vale a imagem da marca.
export function sharePreview({
  title,
  description,
  image,
}: Preview): Pick<Metadata, "openGraph" | "twitter"> {
  const images = image ? [{ url: image.url, alt: image.alt }] : [BRAND_PREVIEW_IMAGE];
  return {
    openGraph: { ...SHARE_BASE, title, description, images },
    twitter: {
      card: image ? "summary" : "summary_large_image",
      title,
      description,
      images,
    },
  };
}
