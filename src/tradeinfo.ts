// The part of a harbour's panel about the trade ship: when it comes, and while it is tied up,
// what it wants and sells, the goods you pick to give and to get, the deal, and the button that makes it.
import { Game, Building, GOODS, Good, SELL_LIMIT, Trader, canTrade, spare, stockLeft, tradeHarbour, traderDeal } from './game';
import { getLang, goodName, join, plural, tr } from './i18n';

// The goods the player has picked in the panel. The UI keeps them between redraws.
export interface TradePick {
  give: Good | null;
  get: Good | null;
}

const EN = {
  head: '🚢 Trade ship',
  about: 'Swap spare goods from your stores for goods you lack. The trader keeps half the worth of what you give, except on the goods below.',
  wants: (goods: string) => `⭐ It wants ${goods}, and pays their full worth.`,
  rare: (goods: string) => `💎 It sells rare ${goods} at their full worth, while they last.`,
  limit: (tools: number, iron: number) => `It sells only ${tools} tools and ${iron} iron on each visit.`,
  and: 'and',
  coming: (s: number) => `The next trade ship comes in about ${s} s.`,
  sailing: 'A trade ship is on its way here.',
  gone: 'The trade ship is sailing away.',
  leaves: (s: number) => `It sails away in about ${s} s.`,
  give: 'You give',
  get: 'You get',
  pick: 'Pick a good to give and a good to get.',
  button: '🚢 Trade',
};

const PL: typeof EN = {
  head: '🚢 Statek kupiecki',
  about: 'Wymień zbędne towary z magazynów na te, których ci brakuje. Kupiec zatrzymuje połowę wartości tego, co dajesz, poza towarami poniżej.',
  wants: (goods) => `⭐ Chce towarów: ${goods} i płaci ich pełną wartość.`,
  rare: (goods) => `💎 Sprzedaje rzadkie towary: ${goods} po pełnej wartości, póki starczy.`,
  limit: (tools, iron) => `Na każdej wizycie sprzedaje tylko ${tools} ${plural(tools, 'narzędzie', 'narzędzia', 'narzędzi')} i ${iron} żelaza.`,
  and: 'i',
  coming: (s) => `Następny statek kupiecki przypłynie za około ${s} s.`,
  sailing: 'Statek kupiecki płynie do portu.',
  gone: 'Statek kupiecki odpływa.',
  leaves: (s) => `Odpłynie za około ${s} s.`,
  give: 'Dajesz',
  get: 'Dostajesz',
  pick: 'Wybierz towar, który dajesz, i towar, który chcesz dostać.',
  button: '🚢 Wymień',
};

const text = () => (getLang() === 'pl' ? PL : EN);

// Round seconds up to the next 30. The panel is drawn again whenever its text changes, which swaps
// out its buttons, so a countdown that changes often would swallow clicks.
const about = (s: number) => Math.max(30, Math.ceil(s / 30) * 30);

// A good to pick. `mark` is ⭐ for a wanted good or 💎 for a rare good on sale.
const chip = (act: 'give' | 'get', k: Good, on: boolean, n?: number, mark = '') =>
  `<button class="chip${on ? ' on' : ''}${mark ? ' special' : ''}" data-act="${act}" data-good="${k}" title="${goodName(k)}">` +
  `<span class="good ${k}"></span>${n ?? ''}${mark}</button>`;

// The chip for a good to get, with how many the ship has left if it sells only a few.
function getChip(t: Trader, k: Good, on: boolean) {
  const left = stockLeft(t, k);
  return chip('get', k, on, left === Infinity ? undefined : left, t.offers.includes(k) ? '💎' : '');
}

const names = (goods: Good[]) => join(goods.map((k) => goodName(k).toLowerCase()), text().and);

// What the ship wants and sells, and its limit on tools and iron.
const wantRows = (t: Trader) =>
  (t.wants.length ? `<p class="desc">${text().wants(names(t.wants))}</p>` : '') +
  (t.offers.length ? `<p class="desc">${text().rare(names(t.offers))}</p>` : '') +
  `<p class="desc">${text().limit(SELL_LIMIT.tool, SELL_LIMIT.iron)}</p>`;

// The rows for the harbour the trade ship visits, as HTML. Other harbours show none.
export function tradeRows(g: Game, b: Building, pick: TradePick): string {
  if (tradeHarbour(g) !== b) return '';
  const x = text(), t = g.trader;
  const head = `<h4>${x.head}</h4>`;
  if (!t) return `${head}<p class="status">${x.coming(about(g.traderT))}</p>`;
  if (t.harbour !== b.id || t.leg !== 'docked') return `${head}<p class="status">${t.leg === 'in' ? x.sailing : x.gone}</p>`;
  const have = GOODS.filter((k) => spare(g, b, k) > 0);
  const give = pick.give && have.includes(pick.give) ? pick.give : null;
  const rows = [
    `${head}<p class="desc">${x.about}</p>${wantRows(t)}<p class="status">${x.leaves(about(t.left))}</p>`,
    `<div class="trade-label">${x.give}</div><div class="chips">${have.map((k) => chip('give', k, k === give, spare(g, b, k), t.wants.includes(k) ? '⭐' : '')).join('')}</div>`,
    `<div class="trade-label">${x.get}</div><div class="chips">${GOODS.filter((k) => k !== give).map((k) => getChip(t, k, k === pick.get)).join('')}</div>`,
  ];
  const get = pick.get !== give ? pick.get : null;
  if (!give || !get) return rows.join('') + `<p class="desc">${x.pick}</p><button class="sail" disabled>${x.button}</button>`;
  const deal = traderDeal(t, give, get), why = canTrade(g, b, give, get);
  rows.push(`<div class="deal">${deal.give} <span class="good ${give}"></span> → ${deal.get} <span class="good ${get}"></span></div>`);
  if (why) rows.push(`<p class="warn">${tr(why)}</p>`);
  return rows.join('') + `<button class="sail" data-act="trade"${why ? ' disabled' : ''}>${x.button}</button>`;
}
