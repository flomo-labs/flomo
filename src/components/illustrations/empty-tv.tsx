// TV fora do ar no formato do tv-outline do Ionicons: tela em quadrados com transparências
// variadas (chuvisco) que piscam, para o EmptyState.
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
          <rect x="14" y="26" width="68" height="36" rx="8" />
        </clipPath>
      </defs>
      <rect x="6" y="18" width="84" height="51" rx="7" />
      <path d="M24 78h48" />
      <g clipPath="url(#empty-tv-screen)" fill="currentColor" stroke="none">
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "0.0s" }}
          x="14"
          y="26"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.4s" }}
          x="18"
          y="26"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.5s" }}
          x="22"
          y="26"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.9s" }}
          x="26"
          y="26"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.0s" }}
          x="38"
          y="26"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.1s" }}
          x="46"
          y="26"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.5s" }}
          x="50"
          y="26"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.6s" }}
          x="58"
          y="26"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-2.0s" }}
          x="62"
          y="26"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.1s" }}
          x="74"
          y="26"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.2s" }}
          x="78"
          y="26"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.6s" }}
          x="18"
          y="30"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.7s" }}
          x="26"
          y="30"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-2.1s" }}
          x="30"
          y="30"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.2s" }}
          x="38"
          y="30"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.3s" }}
          x="46"
          y="30"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.7s" }}
          x="50"
          y="30"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.8s" }}
          x="54"
          y="30"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-2.2s" }}
          x="58"
          y="30"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.3s" }}
          x="66"
          y="30"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.4s" }}
          x="70"
          y="30"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.8s" }}
          x="74"
          y="30"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.9s" }}
          x="14"
          y="34"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "0.0s" }}
          x="22"
          y="34"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.4s" }}
          x="26"
          y="34"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.5s" }}
          x="30"
          y="34"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.9s" }}
          x="34"
          y="34"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.0s" }}
          x="38"
          y="34"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.1s" }}
          x="42"
          y="34"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.5s" }}
          x="50"
          y="34"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.6s" }}
          x="54"
          y="34"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-2.0s" }}
          x="58"
          y="34"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.1s" }}
          x="62"
          y="34"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.2s" }}
          x="66"
          y="34"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.6s" }}
          x="74"
          y="34"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.7s" }}
          x="78"
          y="34"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-2.1s" }}
          x="14"
          y="38"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.2s" }}
          x="18"
          y="38"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.3s" }}
          x="22"
          y="38"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.7s" }}
          x="30"
          y="38"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.8s" }}
          x="34"
          y="38"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-2.2s" }}
          x="42"
          y="38"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.3s" }}
          x="50"
          y="38"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.4s" }}
          x="54"
          y="38"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.8s" }}
          x="58"
          y="38"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.9s" }}
          x="62"
          y="38"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "0.0s" }}
          x="66"
          y="38"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.4s" }}
          x="70"
          y="38"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.5s" }}
          x="74"
          y="38"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.9s" }}
          x="78"
          y="38"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.0s" }}
          x="14"
          y="42"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.1s" }}
          x="18"
          y="42"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.5s" }}
          x="22"
          y="42"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.6s" }}
          x="26"
          y="42"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-2.0s" }}
          x="30"
          y="42"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.1s" }}
          x="34"
          y="42"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.2s" }}
          x="38"
          y="42"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.6s" }}
          x="42"
          y="42"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.7s" }}
          x="50"
          y="42"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-2.1s" }}
          x="54"
          y="42"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.2s" }}
          x="58"
          y="42"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.3s" }}
          x="62"
          y="42"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.7s" }}
          x="66"
          y="42"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.8s" }}
          x="70"
          y="42"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-2.2s" }}
          x="74"
          y="42"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.3s" }}
          x="78"
          y="42"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.4s" }}
          x="14"
          y="46"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.8s" }}
          x="26"
          y="46"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.9s" }}
          x="30"
          y="46"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "0.0s" }}
          x="34"
          y="46"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.4s" }}
          x="38"
          y="46"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.5s" }}
          x="42"
          y="46"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.9s" }}
          x="46"
          y="46"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.0s" }}
          x="50"
          y="46"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.1s" }}
          x="58"
          y="46"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.5s" }}
          x="66"
          y="46"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.6s" }}
          x="70"
          y="46"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-2.0s" }}
          x="74"
          y="46"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.1s" }}
          x="78"
          y="46"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.2s" }}
          x="14"
          y="50"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.6s" }}
          x="18"
          y="50"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.7s" }}
          x="22"
          y="50"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-2.1s" }}
          x="26"
          y="50"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.2s" }}
          x="30"
          y="50"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.3s" }}
          x="34"
          y="50"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.7s" }}
          x="46"
          y="50"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.8s" }}
          x="50"
          y="50"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-2.2s" }}
          x="54"
          y="50"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.3s" }}
          x="58"
          y="50"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.4s" }}
          x="70"
          y="50"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.8s" }}
          x="74"
          y="50"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.9s" }}
          x="78"
          y="50"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "0.0s" }}
          x="14"
          y="54"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.4s" }}
          x="18"
          y="54"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.5s" }}
          x="22"
          y="54"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.9s" }}
          x="26"
          y="54"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.0s" }}
          x="30"
          y="54"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.1s" }}
          x="34"
          y="54"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.5s" }}
          x="38"
          y="54"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.6s" }}
          x="42"
          y="54"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-2.0s" }}
          x="46"
          y="54"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.1s" }}
          x="54"
          y="54"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.2s" }}
          x="58"
          y="54"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.6s" }}
          x="62"
          y="54"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.7s" }}
          x="66"
          y="54"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-2.1s" }}
          x="74"
          y="54"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.2s" }}
          x="14"
          y="58"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.3s" }}
          x="18"
          y="58"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.7s" }}
          x="22"
          y="58"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.8s" }}
          x="26"
          y="58"
          width="4"
          height="4"
          fillOpacity={0.65}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-2.2s" }}
          x="30"
          y="58"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.3s" }}
          x="34"
          y="58"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.4s" }}
          x="38"
          y="58"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.8s" }}
          x="42"
          y="58"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.9s" }}
          x="50"
          y="58"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "0.0s" }}
          x="54"
          y="58"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.4s" }}
          x="58"
          y="58"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.5s" }}
          x="62"
          y="58"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.9s" }}
          x="66"
          y="58"
          width="4"
          height="4"
          fillOpacity={0.18}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.0s" }}
          x="70"
          y="58"
          width="4"
          height="4"
          fillOpacity={0.1}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-0.1s" }}
          x="74"
          y="58"
          width="4"
          height="4"
          fillOpacity={0.3}
        />
        <rect
          className="tv-static-cell"
          style={{ animationDelay: "-1.5s" }}
          x="78"
          y="58"
          width="4"
          height="4"
          fillOpacity={0.45}
        />
      </g>
    </svg>
  );
}
