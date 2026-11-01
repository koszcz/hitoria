// The clock in the top bar: a small dial with the sun or moon for the time of day, then the season
// and the day count. It redraws only when what it shows changes.
import { getLang } from '../i18n';
import { dialAt } from './dial';
import type { Season } from './year';

const ICON: Record<Season, string> = { spring: '🌱', summer: '☀️', autumn: '🍂', winter: '❄️' };
const NAMES = {
  en: { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter', day: 'Day', title: 'Time of day, season and day count' },
  pl: { spring: 'Wiosna', summer: 'Lato', autumn: 'Jesień', winter: 'Zima', day: 'Dzień', title: 'Pora dnia, pora roku i numer dnia' },
};

let shown = '';

export function drawClock(el: HTMLElement, time: number) {
  const d = dialAt(time);
  const x = NAMES[getLang()];
  const angle = Math.round(d.angle);
  const part = Math.round(d.seasonPart * 100);
  const html =
    `<svg class="dial" viewBox="-10 -10 20 20" aria-hidden="true">` +
    `<path class="sky" d="M-9 0A9 9 0 0 1 9 0Z"/><path class="dark" d="M-9 0A9 9 0 0 0 9 0Z"/>` +
    `<g transform="rotate(${angle})"><line y1="0" y2="-5.5"/><circle class="${d.night ? 'moon' : 'sun'}" cy="-6" r="2.4"/></g>` +
    `<circle class="hub" r="1.2"/></svg>` +
    `<div class="when"><div class="season">${ICON[d.season]} ${x[d.season]}</div>` +
    `<div class="bar"><i style="width:${part}%"></i></div><div class="day">${x.day} ${d.day}</div></div>`;
  if (html === shown && el.innerHTML) return;
  el.innerHTML = shown = html;
  el.title = x.title;
}
