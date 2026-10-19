import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { NavigationTracker } from "@/components/back-link";
import { SiteFooter } from "@/components/site-footer";
import { cn } from "@/lib/utils";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
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
      )}
    >
      <body className="min-h-full flex flex-col">
        <NavigationTracker />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
