import { Card } from './Card';

type Props = { label: string; value: string | number; sub?: string };

export function StatTile({ label, value, sub }: Props) {
  return (
    <Card className="text-center">
      <div className="text-[10px] uppercase tracking-[0.2em] text-gold">{label}</div>
      <div className="font-display text-4xl mt-2">{value}</div>
      {sub && <div className="text-xs text-text-dim mt-1">{sub}</div>}
    </Card>
  );
}
