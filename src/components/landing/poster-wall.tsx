import { Poster } from "@/components/catalog/poster";
import { cn } from "@/lib/utils";

// Celular: 5 colunas retas (as das pontas cortadas). Desktop: as mesmas 5
// colunas inclinadas, a última passando da borda da tela.
const COLUMNS = 5;
const ROWS = 5;

// Mosaico decorativo de pôsteres em colunas desencontradas, com o mesmo
// espaço entre eles. Cada coluna flutua inteira, no seu ritmo (parada com
// "reduzir movimento"). Por trás, um único ponto de luz suave. Repete os
// pôsteres quando há menos do que lugares. Ocupa o espaço que o pai der e
// fica escondido de leitores de tela.
export function PosterWall({
  posters,
  className,
}: {
  posters: string[];
  className?: string;
}) {
  return (
    <div aria-hidden className={cn("landing-wall overflow-hidden", className)}>
      <div className="landing-wall-glow absolute inset-0" />
      <PosterGrid posters={posters} />
    </div>
  );
}

function PosterGrid({ posters }: { posters: string[] }) {
  return (
    <div className="landing-wall-grid">
      {Array.from({ length: COLUMNS }, (_, c) => (
        <div
          key={c}
          style={floatRhythm(c)}
          className={cn(
            "poster-float flex flex-col gap-3 md:gap-4",
            c % 2 === 1 && "mt-14",
          )}
        >
          {Array.from({ length: ROWS }, (_, r) => {
            const i = c * ROWS + r;
            return (
              <Poster
                key={r}
                path={posters[i % posters.length]}
                size="w342"
                alt=""
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// Ritmo fixo por posição (sem aleatório, para o servidor e o navegador
// desenharem igual), para as colunas não subirem e descerem juntas.
function floatRhythm(c: number): React.CSSProperties {
  return {
    "--float-duration": `${9 + ((c * 3) % 5)}s`,
    "--float-delay": `-${(c * 4) % 7}s`,
  } as React.CSSProperties;
}
