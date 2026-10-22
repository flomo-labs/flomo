// Bandeja vazia com uma mosca: ilustração de "nada aqui ainda" para o EmptyState.
// Traço em `currentColor`; o tamanho vem do className.
export function EmptyTray({ className }: { className?: string }) {
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
      <path d="M16 56v18a4 4 0 0 0 4 4h56a4 4 0 0 0 4-4V56H62a6 6 0 0 0-6 6H40a6 6 0 0 0-6-6Z" />
      <path d="m16 56 9-20a4 4 0 0 1 3.6-2.4h38.8A4 4 0 0 1 71 36l9 20" />
      <path d="M44 38c-14-8 18-6 13-17" strokeDasharray="1 5" />
      <g strokeWidth={1.6}>
        <ellipse
          cx="53"
          cy="10"
          rx="5.5"
          ry="2.8"
          transform="rotate(-25 53 10)"
        />
        <ellipse
          cx="68"
          cy="10"
          rx="5.5"
          ry="2.8"
          transform="rotate(25 68 10)"
        />
      </g>
      <ellipse
        cx="60.5"
        cy="14"
        rx="2.8"
        ry="4.6"
        fill="currentColor"
        stroke="none"
      />
      <circle cx="60.5" cy="8.5" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
