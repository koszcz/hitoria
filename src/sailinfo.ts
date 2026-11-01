// The part of a harbour's panel about sailing to settle: who and what the ship takes, what you
// still lack, and the button that sends it. A landing harbour's panel shows its idle settlers instead.
import { Game, Building, Good, LANDING_LAND, SAIL_CARGO, SAIL_CREW, lacking } from './game';
import { getLang, goodName, plural, tr } from './i18n';

const EN = {
  head: '⛵ Sail to settle',
  about: `A ship takes ${SAIL_CREW} settlers and these goods to the other island. They build a harbour where they land and claim the land around it.`,
  idle: 'Idle settlers in the HQ',
  button: '⛵ Set sail',
  atSea: 'The ship is on its way.',
  home: 'Your settlers have landed. The ship is back at the dock.',
  landed: 'Your settlers landed here. It is their home, like the HQ.',
  crew: (n: number) => `Idle settlers here: ${n}`,
  land: `Land radius: ${LANDING_LAND} tiles`,
};

const PL: typeof EN = {
  head: '⛵ Wypłyń, by osiedlić',
  about: `Statek zabiera ${SAIL_CREW} osadników i te towary na drugą wyspę. Budują port tam, gdzie wylądują, i zajmują ziemię wokół niego.`,
  idle: 'Wolni osadnicy w siedzibie',
  button: '⛵ Wypłyń',
  atSea: 'Statek jest w drodze.',
  home: 'Twoi osadnicy wylądowali. Statek wrócił do przystani.',
  landed: 'Tu wylądowali twoi osadnicy. To ich dom, jak siedziba.',
  crew: (n) => `Wolni osadnicy tutaj: ${n}`,
  land: `Zasięg ziem: ${LANDING_LAND} ${plural(LANDING_LAND, 'pole', 'pola', 'pól')}`,
};

const text = () => (getLang() === 'pl' ? PL : EN);

// The rows for a finished harbour's panel, as HTML.
export function sailRows(g: Game, b: Building): string {
  const x = text();
  if (b.landed) return `<p class="desc">${x.landed}</p><div>${x.crew(g.poolOf(b))}</div><div>${x.land}</div>`;
  const ship = g.ships.find((s) => s.harbour === b.id);
  const why = g.canSail(b);
  if (ship && (ship.leg !== 'moored' || why === 'Your settlers have already sailed'))
    return `<h4>${x.head}</h4><p class="status">${ship.leg === 'out' ? x.atSea : x.home}</p>`;
  if (why === 'Your settlers have already sailed') return '';
  const short = lacking(g, b);
  const rows = [`<div>🧑‍🌾 ${x.idle}: ${Math.min(g.pool, SAIL_CREW)} / ${SAIL_CREW}</div>`];
  for (const k of Object.keys(SAIL_CARGO) as Good[])
    rows.push(`<div><span class="good ${k}"></span>${goodName(k)}: ${SAIL_CARGO[k]! - (short[k] ?? 0)} / ${SAIL_CARGO[k]}</div>`);
  return `<h4>${x.head}</h4><p class="desc">${x.about}</p>${rows.join('')}` +
    (why ? `<p class="warn">${tr(why)}</p>` : '') +
    `<button class="sail" data-act="sail"${why ? ' disabled' : ''}>${x.button}</button>`;
}
