export function Vignette(): React.ReactElement {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-[1]"
      style={{
        background:
          "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%)",
      }}
    />
  );
}
