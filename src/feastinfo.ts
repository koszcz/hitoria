// The part of a Feast Square's panel about its feasts: the food a feast still needs, the buttons
// that order a wedding or a religious feast, and the blessing while it lasts. The building's
// description says what each feast does.
import { Game, Building, FEAST_FOOD, FeastKind, Good, blessed } from './game';
import { getLang, goodName, tr } from './i18n';

const EN = {
  head: { wedding: '💍 Wedding feast', religious: '🕯️ Religious feast' },
  noneHead: '🎉 Feasts',
  button: { wedding: '💍 Order a wedding feast', religious: '🕯️ Order a religious feast' },
  blessed: '🙏 The village is blessed: everyone works 25% faster until midnight.',
};

const PL: typeof EN = {
  head: { wedding: '💍 Uczta weselna', religious: '🕯️ Uczta religijna' },
  noneHead: '🎉 Uczty',
  button: { wedding: '💍 Zamów ucztę weselną', religious: '🕯️ Zamów ucztę religijną' },
  blessed: '🙏 Wioska jest błogosławiona: wszyscy pracują o 25% szybciej do północy.',
};

const text = () => (getLang() === 'pl' ? PL : EN);

// The line that says the village is blessed, as HTML, or nothing when it is not.
export function blessedRow(g: Game): string {
  return blessed(g) ? `<div class="blessed">${text().blessed}</div>` : '';
}

// The rows for a finished Feast Square's panel, as HTML.
export function feastRows(g: Game, b: Building): string {
  if (!b.built) return '';
  const x = text();
  const f = b.feast;
  const rows = [`<h4>${f ? x.head[f.kind ?? 'wedding'] : x.noneHead}</h4>`, blessedRow(g)];
  if (f?.at === undefined)
    for (const k of Object.keys(FEAST_FOOD) as Good[]) {
      const have = f ? Math.min(b.stock[k], FEAST_FOOD[k]!) : 0;
      rows.push(`<div><span class="good ${k}"></span>${goodName(k)}: ${have} / ${FEAST_FOOD[k]}</div>`);
    }
  if (f) return rows.join('');
  const why = g.canFeast(b);
  if (why) rows.push(`<p class="warn">${tr(why)}</p>`);
  for (const kind of ['wedding', 'religious'] as FeastKind[])
    rows.push(`<button class="sail" data-act="feast" data-kind="${kind}"${why ? ' disabled' : ''}>${x.button[kind]}</button>`);
  return rows.join('');
}
