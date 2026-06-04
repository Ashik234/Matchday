export function Footer() {
  return (
    <footer className="border-t border-text-muted/30 bg-bg-deep">
      <div className="max-w-container mx-auto px-6 lg:px-8 py-10 text-text-dim text-sm space-y-3">
        <div className="font-display text-2xl text-text">MATCHDAY</div>
        <p>Unofficial FIFA World Cup 2026 companion.</p>
        <p>Data: openfootball/worldcup.json · BallDontLie</p>
        <p className="text-xs text-text-muted">Not affiliated with FIFA. © 2026.</p>
      </div>
    </footer>
  );
}
