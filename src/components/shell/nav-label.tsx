// Rótulo do link do cabeçalho. A aba atual é semibold; o mesmo texto invisível
// em semibold reserva a largura nos dois estados, para as vizinhas não se
// mexerem quando a aba muda.
export function NavLabel({
  children,
  active,
}: {
  children: string;
  active: boolean;
}) {
  return (
    <span className="inline-grid">
      <span
        className={`col-start-1 row-start-1 ${active ? "font-semibold" : ""}`}
      >
        {children}
      </span>
      <span
        aria-hidden
        className="invisible col-start-1 row-start-1 font-semibold"
      >
        {children}
      </span>
    </span>
  );
}
