// The goal panel once every goal is reached: the village wish, how close it is, and the season
// it must be met before.
import type { Game } from '../game';
import { getLang, tr } from '../i18n';
import type { Season } from '../seasons/year';

type Now = NonNullable<ReturnType<Game['wishNow']>>;

const TEXT = {
  en: {
    head: 'Village wish',
    granted: (n: number) => `${n} granted`,
    before: { spring: 'before spring', summer: 'before summer', autumn: 'before autumn', winter: 'before the first snow' } as Record<Season, string>,
    title: 'A gentle wish from your settlers. If you miss it, it just passes, and a new one comes.',
  },
  pl: {
    head: 'Życzenie wioski',
    granted: (n: number) => `spełnione: ${n}`,
    before: { spring: 'przed wiosną', summer: 'przed latem', autumn: 'przed jesienią', winter: 'przed pierwszym śniegiem' } as Record<Season, string>,
    title: 'Drobne życzenie twoich osadników. Jeśli go nie spełnisz, po prostu minie i przyjdzie nowe.',
  },
};

export const wishTitle = () => TEXT[getLang()].title;

// The panel's inner HTML for the wish `now`.
export function wishHtml(now: Now): string {
  const x = TEXT[getLang()];
  const granted = now.granted ? ` <span class="granted">· ${x.granted(now.granted)}</span>` : '';
  return (
    `<div class="head">🌟 ${x.head}${granted}</div><div class="text">${tr(now.text)}</div>` +
    `<div class="bar"><i style="width:${Math.round((now.have / now.need) * 100)}%"></i></div>` +
    `<div class="count">${now.have} / ${now.need} · ${x.before[now.before]}</div>`
  );
}
