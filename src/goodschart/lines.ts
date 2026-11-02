// The goods chart's shape: where each good's line runs, and how tall the chart is.
import type { Good, StockSample } from '../game';

export interface ChartLine {
  good: Good;
  points: string; // SVG polyline points, "x,y x,y ..."
  now: number; // how much of the good the stores hold in the latest note
}

export interface Chart {
  lines: ChartLine[];
  top: number; // the amount at the top of the chart
  span: number; // the seconds of game time from the left edge to the right edge
}

// The smallest round number, such as 10, 20, 50 or 100, at or above `v`. Never below 10.
export function roundTop(v: number): number {
  if (v <= 10) return 10;
  let step = 10;
  while (step * 10 < v) step *= 10;
  for (const m of [1, 2, 5]) if (step * m >= v) return step * m;
  return step * 10;
}

// One line for each good, across a chart `w` wide and `h` tall. The oldest note sits at the left
// edge and the latest at the right. A single note draws a flat line across the whole chart.
export function chartLines(samples: StockSample[], goods: Good[], w: number, h: number): Chart {
  if (!samples.length) return { lines: [], top: 10, span: 0 };
  let most = 0;
  for (const s of samples) for (const k of goods) most = Math.max(most, s.stock[k]);
  const top = roundTop(most);
  const t0 = samples[0].t, span = samples.at(-1)!.t - t0;
  const xOf = (t: number) => (span > 0 ? ((t - t0) / span) * w : 0);
  const yOf = (v: number) => h - (v / top) * h;
  const r = (n: number) => Math.round(n * 10) / 10;
  const lines = goods.map((good) => {
    const pts = samples.map((s) => `${r(xOf(s.t))},${r(yOf(s.stock[good]))}`);
    if (span === 0) pts.push(`${w},${r(yOf(samples[0].stock[good]))}`);
    return { good, points: pts.join(' '), now: samples.at(-1)!.stock[good] };
  });
  return { lines, top, span };
}
