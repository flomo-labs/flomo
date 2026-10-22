// TV fora do ar: tela em quadrados com transparências variadas (chuvisco), para o EmptyState.
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
        <rect x="16" y="24" width="4" height="4" fillOpacity={0.18} />
        <rect x="20" y="24" width="4" height="4" fillOpacity={0.1} />
        <rect x="24" y="24" width="4" height="4" fillOpacity={0.3} />
        <rect x="28" y="24" width="4" height="4" fillOpacity={0.65} />
        <rect x="40" y="24" width="4" height="4" fillOpacity={0.45} />
        <rect x="48" y="24" width="4" height="4" fillOpacity={0.18} />
        <rect x="52" y="24" width="4" height="4" fillOpacity={0.45} />
        <rect x="60" y="24" width="4" height="4" fillOpacity={0.45} />
        <rect x="64" y="24" width="4" height="4" fillOpacity={0.1} />
        <rect x="76" y="24" width="4" height="4" fillOpacity={0.3} />
        <rect x="16" y="28" width="4" height="4" fillOpacity={0.3} />
        <rect x="24" y="28" width="4" height="4" fillOpacity={0.1} />
        <rect x="32" y="28" width="4" height="4" fillOpacity={0.45} />
        <rect x="36" y="28" width="4" height="4" fillOpacity={0.3} />
        <rect x="44" y="28" width="4" height="4" fillOpacity={0.45} />
        <rect x="52" y="28" width="4" height="4" fillOpacity={0.1} />
        <rect x="56" y="28" width="4" height="4" fillOpacity={0.65} />
        <rect x="60" y="28" width="4" height="4" fillOpacity={0.65} />
        <rect x="64" y="28" width="4" height="4" fillOpacity={0.45} />
        <rect x="72" y="28" width="4" height="4" fillOpacity={0.45} />
        <rect x="76" y="28" width="4" height="4" fillOpacity={0.45} />
        <rect x="16" y="32" width="4" height="4" fillOpacity={0.3} />
        <rect x="24" y="32" width="4" height="4" fillOpacity={0.1} />
        <rect x="32" y="32" width="4" height="4" fillOpacity={0.45} />
        <rect x="36" y="32" width="4" height="4" fillOpacity={0.1} />
        <rect x="40" y="32" width="4" height="4" fillOpacity={0.18} />
        <rect x="44" y="32" width="4" height="4" fillOpacity={0.3} />
        <rect x="48" y="32" width="4" height="4" fillOpacity={0.1} />
        <rect x="52" y="32" width="4" height="4" fillOpacity={0.45} />
        <rect x="60" y="32" width="4" height="4" fillOpacity={0.45} />
        <rect x="64" y="32" width="4" height="4" fillOpacity={0.18} />
        <rect x="68" y="32" width="4" height="4" fillOpacity={0.45} />
        <rect x="72" y="32" width="4" height="4" fillOpacity={0.65} />
        <rect x="76" y="32" width="4" height="4" fillOpacity={0.1} />
        <rect x="20" y="36" width="4" height="4" fillOpacity={0.45} />
        <rect x="24" y="36" width="4" height="4" fillOpacity={0.45} />
        <rect x="28" y="36" width="4" height="4" fillOpacity={0.65} />
        <rect x="32" y="36" width="4" height="4" fillOpacity={0.1} />
        <rect x="36" y="36" width="4" height="4" fillOpacity={0.18} />
        <rect x="44" y="36" width="4" height="4" fillOpacity={0.45} />
        <rect x="48" y="36" width="4" height="4" fillOpacity={0.65} />
        <rect x="56" y="36" width="4" height="4" fillOpacity={0.45} />
        <rect x="64" y="36" width="4" height="4" fillOpacity={0.45} />
        <rect x="68" y="36" width="4" height="4" fillOpacity={0.1} />
        <rect x="72" y="36" width="4" height="4" fillOpacity={0.3} />
        <rect x="76" y="36" width="4" height="4" fillOpacity={0.65} />
        <rect x="16" y="40" width="4" height="4" fillOpacity={0.45} />
        <rect x="20" y="40" width="4" height="4" fillOpacity={0.3} />
        <rect x="24" y="40" width="4" height="4" fillOpacity={0.18} />
        <rect x="28" y="40" width="4" height="4" fillOpacity={0.3} />
        <rect x="32" y="40" width="4" height="4" fillOpacity={0.45} />
        <rect x="36" y="40" width="4" height="4" fillOpacity={0.3} />
        <rect x="40" y="40" width="4" height="4" fillOpacity={0.18} />
        <rect x="44" y="40" width="4" height="4" fillOpacity={0.18} />
        <rect x="48" y="40" width="4" height="4" fillOpacity={0.1} />
        <rect x="52" y="40" width="4" height="4" fillOpacity={0.1} />
        <rect x="56" y="40" width="4" height="4" fillOpacity={0.65} />
        <rect x="60" y="40" width="4" height="4" fillOpacity={0.1} />
        <rect x="68" y="40" width="4" height="4" fillOpacity={0.45} />
        <rect x="72" y="40" width="4" height="4" fillOpacity={0.18} />
        <rect x="76" y="40" width="4" height="4" fillOpacity={0.45} />
        <rect x="16" y="44" width="4" height="4" fillOpacity={0.3} />
        <rect x="20" y="44" width="4" height="4" fillOpacity={0.18} />
        <rect x="24" y="44" width="4" height="4" fillOpacity={0.65} />
        <rect x="28" y="44" width="4" height="4" fillOpacity={0.3} />
        <rect x="32" y="44" width="4" height="4" fillOpacity={0.18} />
        <rect x="36" y="44" width="4" height="4" fillOpacity={0.45} />
        <rect x="48" y="44" width="4" height="4" fillOpacity={0.45} />
        <rect x="52" y="44" width="4" height="4" fillOpacity={0.3} />
        <rect x="56" y="44" width="4" height="4" fillOpacity={0.1} />
        <rect x="60" y="44" width="4" height="4" fillOpacity={0.18} />
        <rect x="64" y="44" width="4" height="4" fillOpacity={0.1} />
        <rect x="68" y="44" width="4" height="4" fillOpacity={0.3} />
        <rect x="72" y="44" width="4" height="4" fillOpacity={0.3} />
        <rect x="16" y="48" width="4" height="4" fillOpacity={0.65} />
        <rect x="24" y="48" width="4" height="4" fillOpacity={0.45} />
        <rect x="28" y="48" width="4" height="4" fillOpacity={0.45} />
        <rect x="32" y="48" width="4" height="4" fillOpacity={0.18} />
        <rect x="36" y="48" width="4" height="4" fillOpacity={0.18} />
        <rect x="40" y="48" width="4" height="4" fillOpacity={0.65} />
        <rect x="44" y="48" width="4" height="4" fillOpacity={0.18} />
        <rect x="48" y="48" width="4" height="4" fillOpacity={0.45} />
        <rect x="52" y="48" width="4" height="4" fillOpacity={0.3} />
        <rect x="56" y="48" width="4" height="4" fillOpacity={0.45} />
        <rect x="60" y="48" width="4" height="4" fillOpacity={0.3} />
        <rect x="72" y="48" width="4" height="4" fillOpacity={0.18} />
        <rect x="76" y="48" width="4" height="4" fillOpacity={0.3} />
        <rect x="16" y="52" width="4" height="4" fillOpacity={0.65} />
        <rect x="20" y="52" width="4" height="4" fillOpacity={0.65} />
        <rect x="32" y="52" width="4" height="4" fillOpacity={0.65} />
        <rect x="36" y="52" width="4" height="4" fillOpacity={0.65} />
        <rect x="40" y="52" width="4" height="4" fillOpacity={0.18} />
        <rect x="44" y="52" width="4" height="4" fillOpacity={0.65} />
        <rect x="48" y="52" width="4" height="4" fillOpacity={0.45} />
        <rect x="52" y="52" width="4" height="4" fillOpacity={0.65} />
        <rect x="56" y="52" width="4" height="4" fillOpacity={0.3} />
        <rect x="60" y="52" width="4" height="4" fillOpacity={0.18} />
        <rect x="64" y="52" width="4" height="4" fillOpacity={0.65} />
        <rect x="68" y="52" width="4" height="4" fillOpacity={0.3} />
        <rect x="72" y="52" width="4" height="4" fillOpacity={0.65} />
        <rect x="76" y="52" width="4" height="4" fillOpacity={0.18} />
        <rect x="20" y="56" width="4" height="4" fillOpacity={0.3} />
        <rect x="24" y="56" width="4" height="4" fillOpacity={0.18} />
        <rect x="28" y="56" width="4" height="4" fillOpacity={0.1} />
        <rect x="32" y="56" width="4" height="4" fillOpacity={0.45} />
        <rect x="40" y="56" width="4" height="4" fillOpacity={0.3} />
        <rect x="48" y="56" width="4" height="4" fillOpacity={0.1} />
        <rect x="52" y="56" width="4" height="4" fillOpacity={0.18} />
        <rect x="56" y="56" width="4" height="4" fillOpacity={0.1} />
        <rect x="60" y="56" width="4" height="4" fillOpacity={0.65} />
        <rect x="64" y="56" width="4" height="4" fillOpacity={0.1} />
        <rect x="68" y="56" width="4" height="4" fillOpacity={0.3} />
        <rect x="72" y="56" width="4" height="4" fillOpacity={0.3} />
        <rect x="76" y="56" width="4" height="4" fillOpacity={0.3} />
        <rect x="20" y="60" width="4" height="4" fillOpacity={0.1} />
        <rect x="24" y="60" width="4" height="4" fillOpacity={0.3} />
        <rect x="28" y="60" width="4" height="4" fillOpacity={0.3} />
        <rect x="32" y="60" width="4" height="4" fillOpacity={0.45} />
        <rect x="36" y="60" width="4" height="4" fillOpacity={0.18} />
        <rect x="40" y="60" width="4" height="4" fillOpacity={0.1} />
        <rect x="44" y="60" width="4" height="4" fillOpacity={0.3} />
        <rect x="48" y="60" width="4" height="4" fillOpacity={0.45} />
        <rect x="52" y="60" width="4" height="4" fillOpacity={0.18} />
        <rect x="56" y="60" width="4" height="4" fillOpacity={0.65} />
        <rect x="60" y="60" width="4" height="4" fillOpacity={0.3} />
        <rect x="64" y="60" width="4" height="4" fillOpacity={0.18} />
        <rect x="68" y="60" width="4" height="4" fillOpacity={0.65} />
        <rect x="72" y="60" width="4" height="4" fillOpacity={0.3} />
        <rect x="76" y="60" width="4" height="4" fillOpacity={0.1} />
      </g>
    </svg>
  );
}
