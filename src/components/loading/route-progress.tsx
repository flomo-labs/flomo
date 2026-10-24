// Barra fina no topo enquanto uma rota carrega (usada pelos `loading.tsx`, que
// o Next mostra durante a navegação e tira quando a tela chega). Corre da
// esquerda para a direita; com "reduzir movimento" fica parada, sem animação.
export function RouteProgress() {
  return (
    <div
      aria-hidden
      className="fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-primary/20"
    >
      <div className="route-progress-bar h-full w-1/3 bg-primary" />
    </div>
  );
}
