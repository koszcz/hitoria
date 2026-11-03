// The part of a harbour's panel about its wants: how many of each good its island should keep,
// with − and + buttons, and what its boat is doing while it is out on a trip.
import { GOODS, WANT_MAX, WANT_STEP, hasBoat, isleOf, wantOf, type BoatTrip, type Building, type Game } from '../game';
import { getLang, goodName } from '../i18n';

type Place = 'home' | 'other' | 'far';

const EN = {
  head: '📦 Wants',
  note: 'Boats fetch goods from your other islands until this island has this many.',
  noBoat: 'Build a boat at any harbour to fetch them.',
  less: (good: string) => `Want 5 fewer ${good}`,
  more: (good: string) => `Want 5 more ${good}`,
  to: { home: 'the home island', other: 'the other island', far: 'the far island' } as Record<Place, string>,
  out: (n: number, good: string, isle: string) => `Sailing to ${isle} for ${n} ${good}`,
  load: (load: number, n: number, good: string, isle: string) => `Loading ${good} on ${isle}: ${load} / ${n}`,
  carry: (n: number, good: string, isle: string) => `Bringing ${n} ${good} to ${isle}`,
  home: 'Sailing home',
};

const PL: typeof EN = {
  head: '📦 Zamówienia',
  note: 'Łodzie przywożą towary z twoich innych wysp, aż ta wyspa będzie mieć tyle.',
  noBoat: 'Zbuduj łódź w dowolnym porcie, by je przywozić.',
  less: (good: string) => `Zamów o 5 mniej: ${good}`,
  more: (good: string) => `Zamów o 5 więcej: ${good}`,
  to: { home: 'wyspę domową', other: 'drugą wyspę', far: 'daleką wyspę' },
  out: (n, good, isle) => `Płynie na ${isle} po towar: ${good} ×${n}`,
  load: (load, n, good, isle) => `Ładuje towar (${good}) na ${on(isle)}: ${load} / ${n}`,
  carry: (n, good, isle) => `Wiezie na ${isle}: ${good} ×${n}`,
  home: 'Wraca do domu',
};

// "na drugą wyspę" becomes "na drugiej wyspie": where a boat is, not where it goes.
function on(isle: string) {
  return { 'wyspę domową': 'wyspie domowej', 'drugą wyspę': 'drugiej wyspie', 'daleką wyspę': 'dalekiej wyspie' }[isle] ?? isle;
}

const text = () => (getLang() === 'pl' ? PL : EN);

// What the boat of a harbour is doing on its trip, as one line.
export function tripLine(g: Game, t: BoatTrip): string {
  const x = text(), good = goodName(t.g).toLowerCase();
  const isle = (id: number) => {
    const b = g.buildings.get(id);
    return x.to[b ? isleOf(g, b.x, b.y) : 'home'];
  };
  if (t.leg === 'out') return x.out(t.n, good, isle(t.from));
  if (t.leg === 'load') return x.load(t.load, t.n, good, isle(t.from));
  if (t.leg === 'carry') return x.carry(t.load, good, isle(t.to));
  return x.home;
}

// The wants rows for a finished harbour's panel, as HTML. Nothing for any other building.
export function wantRows(g: Game, b: Building): string {
  if (b.type !== 'harbour' || !b.built) return '';
  const x = text();
  const boats = [...g.buildings.values()].some(hasBoat);
  const cells = GOODS.map((k) => {
    const n = wantOf(b, k), name = goodName(k);
    return `<span class="${n ? '' : 'none'}">` +
      `<button class="chip" data-act="want" data-good="${k}" data-step="-${WANT_STEP}" title="${x.less(name)}"${n ? '' : ' disabled'}>−</button>` +
      `<span class="good ${k}" title="${name}"></span>${n}` +
      `<button class="chip" data-act="want" data-good="${k}" data-step="${WANT_STEP}" title="${x.more(name)}"${n >= WANT_MAX ? ' disabled' : ''}>+</button></span>`;
  });
  return `<h4>${x.head}</h4><div class="trade-label">${x.note}</div>` +
    (boats ? '' : `<p class="warn">${x.noBoat}</p>`) +
    `<div class="wants">${cells.join('')}</div>`;
}
