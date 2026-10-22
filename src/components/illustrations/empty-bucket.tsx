// Balde de pipoca caído com grãos pelo chão: ilustração de "biblioteca vazia" para o EmptyState.
// Traço em `currentColor`; o tamanho vem do className.
export function EmptyBucket({ className }: { className?: string }) {
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
      <g
        transform="translate(32 60) rotate(80) scale(0.7) translate(-48 -57)"
        strokeWidth={3 / 0.7}
      >
        <rect x="19" y="30" width="58" height="6" rx="3" />
        <path d="M22 36l6.5 48h39L74 36" />
        <path d="M39.3 36l2.2 48M56.7 36l-2.2 48" />
      </g>
      <g fill="currentColor" stroke="none">
        <circle cx="55.3" cy="61.5" r="3" />
        <circle cx="60.7" cy="61.5" r="3" />
        <circle cx="58" cy="58.2" r="3" />
        <circle cx="63.5" cy="67.4" r="2.8" />
        <circle cx="68.5" cy="67.4" r="2.8" />
        <circle cx="66" cy="64.3" r="2.8" />
        <circle cx="72.3" cy="71.5" r="3" />
        <circle cx="77.7" cy="71.5" r="3" />
        <circle cx="75" cy="68.2" r="3" />
        <circle cx="81.7" cy="65.3" r="2.6" />
        <circle cx="86.3" cy="65.3" r="2.6" />
        <circle cx="84" cy="62.4" r="2.6" />
        <circle cx="77.8" cy="77.2" r="2.4" />
        <circle cx="82.2" cy="77.2" r="2.4" />
        <circle cx="80" cy="74.6" r="2.4" />
      </g>
    </svg>
  );
}
