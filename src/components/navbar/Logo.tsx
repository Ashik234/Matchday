export function Logo() {
  return (
    <div className="font-display text-2xl tracking-wide text-text leading-none">
      FIFA 2
      <span
        data-ball-anchor="logo"
        className="inline-block mx-0.5 rounded-full bg-gold align-baseline"
        style={{ width: '0.85em', height: '0.85em' }}
        aria-label="0"
      />
      26
    </div>
  );
}
