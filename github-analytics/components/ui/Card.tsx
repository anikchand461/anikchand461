import type { CSSProperties, ReactNode } from 'react';
import { P } from '@/lib/palette';

interface CardProps {
  title: string;
  meta?: string;
  accent?: string;
  children: ReactNode;
}

export function Card({ title, meta, accent = P.gold, children }: CardProps) {
  return (
    <section className="card" aria-label={title} style={{ ['--accent' as string]: accent } as CSSProperties}>
      <div className="card-head">
        <h2>{title}</h2>
        {meta && <span className="meta">{meta}</span>}
      </div>
      {children}
    </section>
  );
}

export function SectionTag({ id, color = P.gold, children }: { id: string; color?: string; children: ReactNode }) {
  return (
    <div className="tag" id={id}>
      <b style={{ color, borderColor: color }}>{id}</b>— {children}
    </div>
  );
}

export function Tile({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="tile">
      <div className="label">{label}</div>
      <div className="value" style={color ? { color } : undefined}>{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}
