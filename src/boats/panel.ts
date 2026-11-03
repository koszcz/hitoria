// The part of a harbour's panel about its boat: the "Build a boat" button, the planks the boat
// still needs while it is built, and a line once it is tied up at the dock.
import { BOAT_PLANKS, Building, Game } from '../game';
import { getLang, goodName, tr } from '../i18n';

const EN = {
  head: '⛵ Boat',
  button: `⛵ Build a boat (${BOAT_PLANKS} planks)`,
  done: 'Your boat is tied up at the dock.',
};

const PL: typeof EN = {
  head: '⛵ Łódź',
  button: `⛵ Zbuduj łódź (${BOAT_PLANKS} desek)`,
  done: 'Twoja łódź cumuje przy pomoście.',
};

const text = () => (getLang() === 'pl' ? PL : EN);

// The rows for a harbour's panel, as HTML. Nothing for any other building or an unfinished harbour.
export function boatRows(g: Game, b: Building): string {
  if (b.type !== 'harbour' || !b.built) return '';
  const x = text();
  const rows = [`<h4>${x.head}</h4>`];
  if (b.boat === undefined) {
    const why = g.canBuildBoat(b);
    if (why) rows.push(`<p class="warn">${tr(why)}</p>`);
    rows.push(`<button class="sail" data-act="boat"${why ? ' disabled' : ''}>${x.button}</button>`);
  } else if (b.boat < BOAT_PLANKS) {
    rows.push(`<div><span class="good plank"></span>${goodName('plank')}: ${b.boat} / ${BOAT_PLANKS}</div>`);
  } else rows.push(`<div>${x.done}</div>`);
  return rows.join('');
}
