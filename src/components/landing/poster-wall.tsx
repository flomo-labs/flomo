import { Poster } from "@/components/catalog/poster";
import { cn } from "@/lib/utils";

// Celular: 5 colunas retas (as das pontas cortadas). Desktop: as mesmas 5
// colunas inclinadas, a última passando da borda da tela.
const COLUMNS = 5;
const ROWS = 5;

// Mosaico decorativo de pôsteres em colunas desencontradas, com o mesmo
// espaço entre eles quando parados. Uma onda passa pelos pôsteres (parada com
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
          className={cn("flex flex-col gap-3 md:gap-4", c % 2 === 1 && "mt-14")}
        >
          {Array.from({ length: ROWS }, (_, r) => (
            <div key={r} className="poster-wave" style={waveDelay(c, r)}>
              <Poster
                // Por linha: as repetições (quando há menos pôsteres do que
                // lugares) caem longe umas das outras.
                path={posters[(r * COLUMNS + c) % posters.length]}
                size="w342"
                alt=""
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// Atraso que cresce para a direita e para baixo: o movimento passa pelo
// mosaico como uma onda, e o espaço entre vizinhos estica e encolhe.
function waveDelay(c: number, r: number): React.CSSProperties {
  return { animationDelay: `-${(c * 0.6 + r * 0.35).toFixed(2)}s` };
}
