// The part of a harbour's panel about sailing to settle: who and what the ship takes, which island
// it sails to, what you still lack, and a Sail button for each island nobody has settled yet.
// A landing harbour's panel shows its idle settlers instead.
import { Game, Building, Good, LANDING_LAND, SAIL_CARGO, SAIL_CREW, lacking, landingSpot, onFar, openIsles, type Isle } from './game';
import { getLang, goodName, plural, tr } from './i18n';

const EN = {
  head: '⛵ Sail to settle',
  about: (far: boolean) =>
    `A ship takes ${SAIL_CREW} settlers and these goods to ${far ? 'the far island' : 'the other island'}. They build a harbour where they land and claim the land around it.` +
    (far ? ' Coal and iron lie rich there, so its mines dig twice as fast.' : ''),
  pick: `A ship takes ${SAIL_CREW} settlers and these goods to the island you pick. They build a harbour where they land and claim the land around it.`,
  rich: 'Coal and iron lie rich on the far island, so its mines dig twice as fast.',
  idle: 'Idle settlers in the HQ',
  button: '⛵ Set sail',
  to: { other: '⛵ Sail to the other island', far: '⛵ Sail to the far island' } as Record<Isle, string>,
  atSea: 'The ship is on its way.',
  home: 'Your settlers have landed. The ship is back at the dock.',
  landed: 'Your settlers landed here. It is their home, like the HQ.',
  crew: (n: number) => `Idle settlers here: ${n}`,
  land: `Land radius: ${LANDING_LAND} tiles`,
};

const PL: typeof EN = {
  head: '⛵ Wypłyń, by osiedlić',
  about: (far) =>
    `Statek zabiera ${SAIL_CREW} osadników i te towary na ${far ? 'daleką' : 'drugą'} wyspę. Budują port tam, gdzie wylądują, i zajmują ziemię wokół niego.` +
    (far ? ' Węgiel i żelazo są tam bogate, więc kopalnie kopią dwa razy szybciej.' : ''),
  pick: `Statek zabiera ${SAIL_CREW} osadników i te towary na wyspę, którą wybierzesz. Budują port tam, gdzie wylądują, i zajmują ziemię wokół niego.`,
  rich: 'Węgiel i żelazo są bogate na dalekiej wyspie, więc kopalnie kopią tam dwa razy szybciej.',
  idle: 'Wolni osadnicy w siedzibie',
  button: '⛵ Wypłyń',
  to: { other: '⛵ Płyń na drugą wyspę', far: '⛵ Płyń na daleką wyspę' },
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
  const isles = openIsles(g);
  const rows = [`<div>🧑‍🌾 ${x.idle}: ${Math.min(g.pool, SAIL_CREW)} / ${SAIL_CREW}</div>`];
  for (const k of Object.keys(SAIL_CARGO) as Good[])
    rows.push(`<div><span class="good ${k}"></span>${goodName(k)}: ${SAIL_CARGO[k]! - (short[k] ?? 0)} / ${SAIL_CARGO[k]}</div>`);
  return `<h4>${x.head}</h4><p class="desc">${about(g, b, isles)}</p>${rows.join('')}` + buttons(g, b, isles);
}

// What the ship takes and where. With two islands to pick from, it says so.
function about(g: Game, b: Building, isles: Isle[]) {
  const x = text();
  if (isles.length > 1) return `${x.pick} ${isles.includes('far') ? x.rich : ''}`.trim();
  const spot = landingSpot(g, b);
  return x.about(isles[0] === 'far' || (!!spot && onFar(g, spot.land.x, spot.land.y)));
}

// One Sail button for each island nobody has settled yet, or a single button on older maps.
// Each reason a button is off shows once above them.
function buttons(g: Game, b: Building, isles: Isle[]) {
  const x = text();
  const picks: (Isle | undefined)[] = isles.length ? isles : [undefined];
  const whys = picks.map((i) => g.canSail(b, i));
  const warns = [...new Set(whys.filter((w) => w))].map((w) => `<p class="warn">${tr(w!)}</p>`).join('');
  return warns + picks.map((i, n) =>
    `<button class="sail" data-act="sail"${i ? ` data-isle="${i}"` : ''}${whys[n] ? ' disabled' : ''}>${i ? x.to[i] : x.button}</button>`,
  ).join('');
}
