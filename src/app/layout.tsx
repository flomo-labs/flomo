import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter, Roboto } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Só para o botão do Google, que pede Roboto Medium.
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: "500",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Flomo",
  description: "Acompanhe filmes e séries, avalie e compartilhe com amigos.",
};

// Deixa a barra inferior usar a área segura do iPhone (env(safe-area-inset-bottom)).
export const viewport: Viewport = { viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={cn(
        "h-full antialiased dark font-sans",
        inter.variable,
        geistMono.variable,
        roboto.variable,
      )}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <SiteFooter />
        <Toaster />
      </body>
    </html>
  );
}
