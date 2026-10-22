// Balde de pipoca virado para a frente, com grãos caindo: ilustração de "biblioteca vazia" para o EmptyState.
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
      <path d="M22.4 35 66.8 20.9A7 15 -28.8 0 1 81.2 47.1L45.6 77" />
      <path d="M29.1 68.3 70.8 41.8M21 53.6 65.8 32.6" />
      <ellipse
        cx="34"
        cy="56"
        rx="11"
        ry="24"
        transform="rotate(-28.8 34 56)"
      />
      <g fill="currentColor" stroke="none">
        <circle cx="26.9" cy="49.7" r="3.4" />
        <circle cx="33.1" cy="49.7" r="3.4" />
        <circle cx="30" cy="46.0" r="3.4" />
        <circle cx="35.9" cy="59.7" r="3.4" />
        <circle cx="42.1" cy="59.7" r="3.4" />
        <circle cx="39" cy="56.0" r="3.4" />
        <circle cx="24.9" cy="64.7" r="3.4" />
        <circle cx="31.1" cy="64.7" r="3.4" />
        <circle cx="28" cy="61.0" r="3.4" />
        <circle cx="29.1" cy="73.6" r="3.2" />
        <circle cx="34.9" cy="73.6" r="3.2" />
        <circle cx="32" cy="70.1" r="3.2" />
        <circle cx="17.1" cy="77.6" r="3.2" />
        <circle cx="22.9" cy="77.6" r="3.2" />
        <circle cx="20" cy="74.1" r="3.2" />
        <circle cx="7.3" cy="69.5" r="3" />
        <circle cx="12.7" cy="69.5" r="3" />
        <circle cx="10" cy="66.2" r="3" />
        <circle cx="19.3" cy="87.5" r="3" />
        <circle cx="24.7" cy="87.5" r="3" />
        <circle cx="22" cy="84.2" r="3" />
        <circle cx="35.3" cy="87.5" r="3" />
        <circle cx="40.7" cy="87.5" r="3" />
        <circle cx="38" cy="84.2" r="3" />
        <circle cx="5.7" cy="83.3" r="2.6" />
        <circle cx="10.3" cy="83.3" r="2.6" />
        <circle cx="8" cy="80.4" r="2.6" />
      </g>
    </svg>
  );
}
