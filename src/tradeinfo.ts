// The part of a harbour's panel about the trade ship: when it comes, and while it is tied up,
// the goods you pick to give and to get, the deal, and the button that makes it.
import { Game, Building, GOODS, Good, canTrade, dealFor, spare, tradeHarbour } from './game';
import { getLang, goodName, tr } from './i18n';

// The goods the player has picked in the panel. The UI keeps them between redraws.
export interface TradePick {
  give: Good | null;
  get: Good | null;
}

const EN = {
  head: '🚢 Trade ship',
  about: 'Swap spare goods from your stores for goods you lack. The trader keeps half the worth of what you give.',
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
  about: 'Wymień zbędne towary z magazynów na te, których ci brakuje. Kupiec zatrzymuje połowę wartości tego, co dajesz.',
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

const chip = (act: 'give' | 'get', k: Good, on: boolean, n?: number) =>
  `<button class="chip${on ? ' on' : ''}" data-act="${act}" data-good="${k}" title="${goodName(k)}">` +
  `<span class="good ${k}"></span>${n ?? ''}</button>`;

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
    `${head}<p class="desc">${x.about}</p><p class="status">${x.leaves(about(t.left))}</p>`,
    `<div class="trade-label">${x.give}</div><div class="chips">${have.map((k) => chip('give', k, k === give, spare(g, b, k))).join('')}</div>`,
    `<div class="trade-label">${x.get}</div><div class="chips">${GOODS.filter((k) => k !== give).map((k) => chip('get', k, k === pick.get)).join('')}</div>`,
  ];
  const get = pick.get !== give ? pick.get : null;
  if (!give || !get) return rows.join('') + `<p class="desc">${x.pick}</p><button class="sail" disabled>${x.button}</button>`;
  const deal = dealFor(give, get), why = canTrade(g, b, give, get);
  rows.push(`<div class="deal">${deal.give} <span class="good ${give}"></span> → ${deal.get} <span class="good ${get}"></span></div>`);
  if (why) rows.push(`<p class="warn">${tr(why)}</p>`);
  return rows.join('') + `<button class="sail" data-act="trade"${why ? ' disabled' : ''}>${x.button}</button>`;
}
