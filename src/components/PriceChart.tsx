import { eur } from "@/lib/money";

export type PricePoint = { day: string; value: number };

/** Gráfico simples (SVG) da evolução do preço de referência. */
export function PriceChart({ points }: { points: PricePoint[] }) {
  if (points.length < 2) {
    return (
      <p className="text-sm text-zinc-500">
        Ainda sem histórico suficiente. O preço é registado todos os dias; volta daqui a uns dias.
      </p>
    );
  }
  const W = 320;
  const H = 120;
  const PAD = 6;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => PAD + (i / (points.length - 1)) * (W - 2 * PAD);
  const y = (v: number) => H - PAD - ((v - min) / span) * (H - 2 * PAD);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const first = points[0];
  const last = points[points.length - 1];
  const delta = first.value ? ((last.value - first.value) / first.value) * 100 : 0;

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Evolução do preço">
        <path d={path} fill="none" stroke="currentColor" strokeWidth="2" className="text-brand" />
      </svg>
      <figcaption className="flex justify-between text-xs text-zinc-500">
        <span>{first.day}: {eur(first.value)}</span>
        <span>{delta >= 0 ? "+" : ""}{delta.toFixed(1)}%</span>
        <span>{last.day}: {eur(last.value)}</span>
      </figcaption>
    </figure>
  );
}
