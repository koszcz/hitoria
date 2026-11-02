// The goods chart panel: a line for each picked good, showing how much the stores held over the
// last hour. It opens from the goods bar or the G key, and it redraws while the game runs.
import { GOODS, type Game, type Good } from '../game';
import { T, getLang, goodName } from '../i18n';
import { chartLines } from './lines';

const EN = {
  title: 'Goods over time',
  pick: 'Click a good to show or hide its line.',
  span: (min: number) => (min < 1 ? 'Less than a minute ago' : `${min} min ago`),
  now: 'Now',
  empty: 'The chart fills in as the game runs.',
};
const PL: typeof EN = {
  title: 'Towary w czasie',
  pick: 'Kliknij towar, by pokazać lub ukryć jego linię.',
  span: (min) => (min < 1 ? 'Niecałą minutę temu' : `${min} min temu`),
  now: 'Teraz',
  empty: 'Wykres wypełnia się w trakcie gry.',
};
const GT = () => (getLang() === 'pl' ? PL : EN);

// One colour for each good, close to the colour of its icon.
const COLOUR: Record<Good, string> = {
  log: '#a0642e', plank: '#e6c08a', stone: '#b8b6ae', fish: '#8fc4dc', grain: '#e3bf4c',
  flour: '#f3eee2', bread: '#d08640', water: '#4f8fd0', coal: '#6a6664', ore: '#c07858',
  meat: '#d0505a', iron: '#8aa0b4', tool: '#9ad06a',
};

const W = 440, H = 200; // the chart's drawing area, in SVG units
const shown = new Set<Good>(['log', 'plank', 'stone', 'fish']); // the picked goods, kept while the page is open

function chartSvg(game: Game) {
  const samples = game.stockHistory;
  const c = chartLines(samples, GOODS.filter((k) => shown.has(k)), W, H);
  const grid = [0, 0.5, 1].map((f) => {
    const y = H - f * H;
    return `<line x1="0" x2="${W}" y1="${y}" y2="${y}" class="grid"/><text x="-6" y="${y + 4}" class="axis" text-anchor="end">${c.top * f}</text>`;
  }).join('');
  const lines = c.lines.map((l) => `<polyline points="${l.points}" stroke="${COLOUR[l.good]}"/>`).join('');
  const x = GT();
  const left = samples.length ? x.span(Math.floor(c.span / 60)) : '';
  return `<svg viewBox="-34 -8 ${W + 42} ${H + 30}" role="img" aria-label="${x.title}">${grid}${lines}` +
    `<text x="0" y="${H + 20}" class="axis">${left}</text><text x="${W}" y="${H + 20}" class="axis" text-anchor="end">${x.now}</text></svg>`;
}

function chipsHtml(game: Game) {
  const now = game.stockHistory.at(-1)?.stock;
  return GOODS.map((k) =>
    `<button data-good="${k}" class="${shown.has(k) ? 'on' : ''}" title="${goodName(k)}" style="--line:${COLOUR[k]}">` +
    `<span class="good ${k}"></span><b>${now ? now[k] : 0}</b></button>`).join('');
}

// Open the panel. `game` is read again on every redraw, so a loaded game shows its own record.
export function openGoodsChart(game: () => Game) {
  if (closeGoodsChart()) return;
  const x = GT();
  const box = document.createElement('div');
  box.id = 'goodschart';
  box.innerHTML = `
    <div class="panel">
      <h2>📈 ${x.title}</h2>
      <div class="chips"></div>
      <p>${x.pick}</p>
      <div class="plot"></div>
      <div class="actions"><button class="close">${T().backToGame}</button></div>
    </div>`;
  const chips = box.querySelector<HTMLElement>('.chips')!, plot = box.querySelector<HTMLElement>('.plot')!;
  const draw = () => {
    const g = game();
    const c = chipsHtml(g);
    if (chips.innerHTML !== c) chips.innerHTML = c;
    plot.innerHTML = g.stockHistory.length ? chartSvg(g) : `<p class="empty">${x.empty}</p>`;
  };
  chips.onclick = (e) => {
    const k = (e.target as HTMLElement).closest<HTMLElement>('[data-good]')?.dataset.good as Good | undefined;
    if (!k) return;
    if (shown.has(k)) shown.delete(k);
    else shown.add(k);
    draw();
  };
  const timer = setInterval(draw, 1000);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'Enter' || e.key === 'g' || e.key === 'G') closeGoodsChart();
    e.stopPropagation();
  };
  addEventListener('keydown', onKey, true);
  stop = () => {
    clearInterval(timer);
    removeEventListener('keydown', onKey, true);
    box.remove();
  };
  box.onclick = (e) => { if (e.target === box) closeGoodsChart(); };
  box.querySelector<HTMLButtonElement>('.close')!.onclick = () => closeGoodsChart();
  draw();
  document.body.append(box);
}

let stop: (() => void) | null = null;

// Close the panel if it is open. Returns whether it was.
export function closeGoodsChart() {
  if (!stop) return false;
  const s = stop;
  stop = null;
  s();
  return true;
}
