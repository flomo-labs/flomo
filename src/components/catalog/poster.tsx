import Image from "next/image";
import { tmdbImageUrl, type TmdbImageSize } from "@/infra/catalog/tmdb/images";
import { cn } from "@/lib/utils";

// Pôster do TMDB (proporção 2:3). Sem imagem, um bloco neutro mantém o
// espaço. O CDN do TMDB já serve os tamanhos, então o otimizador do Next não
// entra (`unoptimized`). `priority` só no pôster que é o maior elemento da
// tela (LCP, ex. página do título): `loading="eager"` + `fetchPriority="high"`
// (no Next 16 o `priority` do Image foi descontinuado).
export function Poster({
  path,
  size,
  alt,
  className,
  priority = false,
}: {
  path: string | null;
  size: TmdbImageSize;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const src = tmdbImageUrl(path, size);
  return (
    <div
      className={cn(
        "relative aspect-[2/3] overflow-hidden rounded-poster bg-muted",
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(min-width: 640px) 12rem, 7rem"
          unoptimized
          {...(priority ? { loading: "eager", fetchPriority: "high" } : {})}
          className="object-cover"
        />
      ) : null}
    </div>
  );
}
