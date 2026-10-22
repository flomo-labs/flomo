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
          <rect x="16" y="24" width="64" height="40" rx="4" />
        </clipPath>
      </defs>
      <rect x="10" y="18" width="76" height="52" rx="9" />
      <path d="M34 80h28" />
      <g clipPath="url(#empty-tv-screen)" fill="currentColor" stroke="none">
        <rect x="16" y="24" width="8" height="8" fillOpacity={0.18} />
        <rect x="24" y="24" width="8" height="8" fillOpacity={0.1} />
        <rect x="32" y="24" width="8" height="8" fillOpacity={0.3} />
        <rect x="40" y="24" width="8" height="8" fillOpacity={0.65} />
        <rect x="64" y="24" width="8" height="8" fillOpacity={0.45} />
        <rect x="16" y="32" width="8" height="8" fillOpacity={0.18} />
        <rect x="24" y="32" width="8" height="8" fillOpacity={0.45} />
        <rect x="40" y="32" width="8" height="8" fillOpacity={0.45} />
        <rect x="48" y="32" width="8" height="8" fillOpacity={0.1} />
        <rect x="72" y="32" width="8" height="8" fillOpacity={0.3} />
        <rect x="16" y="40" width="8" height="8" fillOpacity={0.3} />
        <rect x="32" y="40" width="8" height="8" fillOpacity={0.1} />
        <rect x="48" y="40" width="8" height="8" fillOpacity={0.45} />
        <rect x="56" y="40" width="8" height="8" fillOpacity={0.3} />
        <rect x="72" y="40" width="8" height="8" fillOpacity={0.45} />
        <rect x="24" y="48" width="8" height="8" fillOpacity={0.1} />
        <rect x="32" y="48" width="8" height="8" fillOpacity={0.65} />
        <rect x="40" y="48" width="8" height="8" fillOpacity={0.65} />
        <rect x="48" y="48" width="8" height="8" fillOpacity={0.45} />
        <rect x="64" y="48" width="8" height="8" fillOpacity={0.45} />
        <rect x="72" y="48" width="8" height="8" fillOpacity={0.45} />
        <rect x="16" y="56" width="8" height="8" fillOpacity={0.3} />
        <rect x="32" y="56" width="8" height="8" fillOpacity={0.1} />
        <rect x="48" y="56" width="8" height="8" fillOpacity={0.45} />
        <rect x="56" y="56" width="8" height="8" fillOpacity={0.1} />
        <rect x="64" y="56" width="8" height="8" fillOpacity={0.18} />
        <rect x="72" y="56" width="8" height="8" fillOpacity={0.3} />
      </g>
    </svg>
  );
}
