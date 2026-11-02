// The part of a building's panel that shows how fast it makes and uses goods, counted over the last minute.
import { Building, Game, GOODS, Good, RECIPES, hungryWorker, ratesOf } from './game';
import { makes } from './buildinfo';
import { getLang, goodName } from './i18n';

const EN = {
  title: 'In the last minute:',
  made: 'Made',
  used: 'Used',
  none: 'Nothing made or used in the last minute.',
};

const PL: typeof EN = {
  title: 'W ostatniej minucie:',
  made: 'Wytworzono',
  used: 'Zużyto',
  none: 'W ostatniej minucie nic nie wytworzono ani nie zużyto.',
};

const text = () => (getLang() === 'pl' ? PL : EN);

// Does this building make or use goods at all? Others, such as a lookout, show no rates.
const trades = (b: Building) => !!makes(b.type) || !!RECIPES[b.type] || b.type === 'house' || hungryWorker(b.type);

const row = (label: string, k: Good, n: number) =>
  `<div>${label} <span class="good ${k}"></span>${n} ${goodName(k)}</div>`;

// The rows for a finished building's panel, as HTML.
export function rateRows(g: Game, b: Building): string {
  const r = ratesOf(g, b), x = text();
  const lines: string[] = [];
  for (const k of GOODS) if (r.made[k]) lines.push(row(x.made, k, r.made[k]!));
  for (const k of GOODS) if (r.used[k]) lines.push(row(x.used, k, r.used[k]!));
  if (lines.length) return `<div class="trade-label">${x.title}</div>${lines.join('')}`;
  return trades(b) ? `<p class="desc">${x.none}</p>` : '';
}
