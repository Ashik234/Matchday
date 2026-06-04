import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Flag } from '@/components/ui/Flag';
import { toSlug } from '@/utils/slug';
import type { Group } from '@/data/types';

export function GroupCard({ group }: { group: Group }) {
  return (
    <Card>
      <div className="text-[10px] uppercase tracking-[0.3em] text-gold mb-3">Group {group.letter}</div>
      <table className="w-full text-xs">
        <thead className="text-text-dim">
          <tr>
            <th className="text-left pb-2">Team</th>
            <th className="pb-2">P</th>
            <th className="pb-2">W</th>
            <th className="pb-2">D</th>
            <th className="pb-2">L</th>
            <th className="pb-2">GD</th>
            <th className="pb-2 text-right">Pts</th>
          </tr>
        </thead>
        <tbody>
          {group.standings.map((row, i) => (
            <motion.tr
              key={row.team.id}
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className={i < 2 ? 'border-l-2 border-gold pl-1' : ''}
            >
              <td className="py-1.5">
                <Link
                  to={`/team/${toSlug(row.team.name)}`}
                  className="inline-flex items-center gap-2 hover:text-gold transition-colors"
                >
                  <Flag countryCode={row.team.countryCode} size="sm" />
                  <span className="font-semibold">{row.team.name}</span>
                </Link>
              </td>
              <td className="text-center">{row.played}</td>
              <td className="text-center">{row.won}</td>
              <td className="text-center">{row.drawn}</td>
              <td className="text-center">{row.lost}</td>
              <td className="text-center font-mono">{row.gd >= 0 ? `+${row.gd}` : row.gd}</td>
              <td className="text-right font-mono font-bold">{row.pts}</td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
