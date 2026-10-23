// TV fora do ar: tela em quadrados com transparências variadas (chuvisco) que piscam, para o EmptyState.
// Traço em `currentColor`; o tamanho vem do className.
export function EmptyTv({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 96 96"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <defs>
        <clipPath id="empty-tv-screen">
          <rect x="16" y="24" width="64" height="40" rx="8" />
        </clipPath>
      </defs>
      <rect x="10" y="18" width="76" height="52" rx="9" />
      <path d="M34 80h28" />
      <g clipPath="url(#empty-tv-screen)" fill="currentColor" stroke="none">
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "0.0s" }}
          x="16"
          y="24"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.4s" }}
          x="20"
          y="24"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.5s" }}
          x="24"
          y="24"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.9s" }}
          x="28"
          y="24"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.0s" }}
          x="40"
          y="24"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.1s" }}
          x="48"
          y="24"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.5s" }}
          x="52"
          y="24"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.6s" }}
          x="60"
          y="24"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-2.0s" }}
          x="64"
          y="24"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.1s" }}
          x="76"
          y="24"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.2s" }}
          x="16"
          y="28"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.6s" }}
          x="24"
          y="28"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.7s" }}
          x="32"
          y="28"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-2.1s" }}
          x="36"
          y="28"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.2s" }}
          x="44"
          y="28"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.3s" }}
          x="52"
          y="28"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.7s" }}
          x="56"
          y="28"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.8s" }}
          x="60"
          y="28"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-2.2s" }}
          x="64"
          y="28"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.3s" }}
          x="72"
          y="28"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.4s" }}
          x="76"
          y="28"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.8s" }}
          x="16"
          y="32"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.9s" }}
          x="24"
          y="32"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "0.0s" }}
          x="32"
          y="32"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.4s" }}
          x="36"
          y="32"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.5s" }}
          x="40"
          y="32"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.9s" }}
          x="44"
          y="32"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.0s" }}
          x="48"
          y="32"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.1s" }}
          x="52"
          y="32"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.5s" }}
          x="60"
          y="32"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.6s" }}
          x="64"
          y="32"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-2.0s" }}
          x="68"
          y="32"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.1s" }}
          x="72"
          y="32"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.2s" }}
          x="76"
          y="32"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.6s" }}
          x="20"
          y="36"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.7s" }}
          x="24"
          y="36"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-2.1s" }}
          x="28"
          y="36"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.2s" }}
          x="32"
          y="36"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.3s" }}
          x="36"
          y="36"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.7s" }}
          x="44"
          y="36"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.8s" }}
          x="48"
          y="36"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-2.2s" }}
          x="56"
          y="36"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.3s" }}
          x="64"
          y="36"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.4s" }}
          x="68"
          y="36"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.8s" }}
          x="72"
          y="36"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.9s" }}
          x="76"
          y="36"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "0.0s" }}
          x="16"
          y="40"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.4s" }}
          x="20"
          y="40"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.5s" }}
          x="24"
          y="40"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.9s" }}
          x="28"
          y="40"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.0s" }}
          x="32"
          y="40"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.1s" }}
          x="36"
          y="40"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.5s" }}
          x="40"
          y="40"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.6s" }}
          x="44"
          y="40"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-2.0s" }}
          x="48"
          y="40"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.1s" }}
          x="52"
          y="40"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.2s" }}
          x="56"
          y="40"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.6s" }}
          x="60"
          y="40"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.7s" }}
          x="68"
          y="40"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-2.1s" }}
          x="72"
          y="40"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.2s" }}
          x="76"
          y="40"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.3s" }}
          x="16"
          y="44"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.7s" }}
          x="20"
          y="44"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.8s" }}
          x="24"
          y="44"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-2.2s" }}
          x="28"
          y="44"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.3s" }}
          x="32"
          y="44"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.4s" }}
          x="36"
          y="44"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.8s" }}
          x="48"
          y="44"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.9s" }}
          x="52"
          y="44"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "0.0s" }}
          x="56"
          y="44"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.4s" }}
          x="60"
          y="44"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.5s" }}
          x="64"
          y="44"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.9s" }}
          x="68"
          y="44"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.0s" }}
          x="72"
          y="44"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.1s" }}
          x="16"
          y="48"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.5s" }}
          x="24"
          y="48"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.6s" }}
          x="28"
          y="48"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-2.0s" }}
          x="32"
          y="48"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.1s" }}
          x="36"
          y="48"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.2s" }}
          x="40"
          y="48"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.6s" }}
          x="44"
          y="48"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.7s" }}
          x="48"
          y="48"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-2.1s" }}
          x="52"
          y="48"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.2s" }}
          x="56"
          y="48"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.3s" }}
          x="60"
          y="48"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.7s" }}
          x="72"
          y="48"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.8s" }}
          x="76"
          y="48"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-2.2s" }}
          x="16"
          y="52"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.3s" }}
          x="20"
          y="52"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.4s" }}
          x="32"
          y="52"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.8s" }}
          x="36"
          y="52"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.9s" }}
          x="40"
          y="52"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "0.0s" }}
          x="44"
          y="52"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.4s" }}
          x="48"
          y="52"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.5s" }}
          x="52"
          y="52"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.9s" }}
          x="56"
          y="52"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.0s" }}
          x="60"
          y="52"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.1s" }}
          x="64"
          y="52"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.5s" }}
          x="68"
          y="52"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.6s" }}
          x="72"
          y="52"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-2.0s" }}
          x="76"
          y="52"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.1s" }}
          x="20"
          y="56"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.2s" }}
          x="24"
          y="56"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.6s" }}
          x="28"
          y="56"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.7s" }}
          x="32"
          y="56"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-2.1s" }}
          x="40"
          y="56"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.2s" }}
          x="48"
          y="56"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.3s" }}
          x="52"
          y="56"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.7s" }}
          x="56"
          y="56"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.8s" }}
          x="60"
          y="56"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-2.2s" }}
          x="64"
          y="56"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.3s" }}
          x="68"
          y="56"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.4s" }}
          x="72"
          y="56"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.8s" }}
          x="76"
          y="56"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.9s" }}
          x="20"
          y="60"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "0.0s" }}
          x="24"
          y="60"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.4s" }}
          x="28"
          y="60"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.5s" }}
          x="32"
          y="60"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.9s" }}
          x="36"
          y="60"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.0s" }}
          x="40"
          y="60"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.1s" }}
          x="44"
          y="60"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.5s" }}
          x="48"
          y="60"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.6s" }}
          x="52"
          y="60"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-2.0s" }}
          x="56"
          y="60"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.1s" }}
          x="60"
          y="60"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.2s" }}
          x="64"
          y="60"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.6s" }}
          x="68"
          y="60"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.7s" }}
          x="72"
          y="60"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-2.1s" }}
          x="76"
          y="60"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
      </g>
    </svg>
  );
}
