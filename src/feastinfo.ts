// The part of a Feast Square's panel about the wedding feast: the food it still needs, and the
// button that orders it. The building's description says what a feast does.
import { Game, Building, FEAST_FOOD, Good } from './game';
import { getLang, goodName, tr } from './i18n';

const EN = {
  head: '💍 Wedding feast',
  button: '💍 Order a wedding feast',
};

const PL: typeof EN = {
  head: '💍 Uczta weselna',
  button: '💍 Zamów ucztę weselną',
};

const text = () => (getLang() === 'pl' ? PL : EN);

// The rows for a finished Feast Square's panel, as HTML.
export function feastRows(g: Game, b: Building): string {
  if (!b.built) return '';
  const x = text();
  const rows = [`<h4>${x.head}</h4>`];
  if (b.feast?.at === undefined)
    for (const k of Object.keys(FEAST_FOOD) as Good[]) {
      const have = b.feast ? Math.min(b.stock[k], FEAST_FOOD[k]!) : 0;
      rows.push(`<div><span class="good ${k}"></span>${goodName(k)}: ${have} / ${FEAST_FOOD[k]}</div>`);
    }
  if (b.feast) return rows.join('');
  const why = g.canFeast(b);
  if (why) rows.push(`<p class="warn">${tr(why)}</p>`);
  rows.push(`<button class="sail" data-act="feast"${why ? ' disabled' : ''}>${x.button}</button>`);
  return rows.join('');
}
