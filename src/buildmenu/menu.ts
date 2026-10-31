// The build menu: a dialog that lists the buildings by group. Pick one to place it on the map.
// With a mouse, hovering shows a building's details and a click picks it. On a touch screen the
// first tap shows the details and a second tap, or the Build button, picks it.
import { BDEFS, type BType, type Game } from '../game';
import { T, buildingName } from '../i18n';
import { GROUPS, canPay } from './groups';
import { cardHtml, costText } from './card';

export interface BuildMenuOptions {
  game: Game;
  current: BType | null; // the building already picked, shown first
  touch: boolean;
  pick(type: BType): void;
}

export function openBuildMenu(o: BuildMenuOptions) {
  if (document.getElementById('buildmenu')) return;
  const x = T();
  const box = document.createElement('div');
  box.id = 'buildmenu';
  const stored = o.game.stored;
  const groups = GROUPS.map(({ group, types }) =>
    `<h4>${x.groups[group]}</h4><div class="tiles">` +
    types.map((t) =>
      `<button class="tile${canPay(stored, t) ? '' : ' short'}" data-type="${t}">` +
      `<span class="icon">${BDEFS[t].icon}</span><span class="name">${buildingName(t)}</span>` +
      `<span class="cost">${costText(BDEFS[t].cost)}</span></button>`).join('') +
    `</div>`).join('');
  box.innerHTML = `
    <div class="panel">
      <header><h2>${x.buildMenu}</h2><button class="close" title="${x.close}">✕</button></header>
      <div class="body">
        <div class="list">${groups}</div>
        <div class="details"><div class="card"></div><button class="go"></button></div>
      </div>
    </div>`;
  const card = box.querySelector<HTMLElement>('.card')!;
  const go = box.querySelector<HTMLButtonElement>('.go')!;
  let shown: BType | null = null;

  const show = (t: BType) => {
    shown = t;
    card.innerHTML = cardHtml(o.game, t);
    go.textContent = x.buildIt(buildingName(t));
    for (const b of box.querySelectorAll<HTMLElement>('.tile')) b.classList.toggle('shown', b.dataset.type === t);
  };
  const close = () => {
    box.remove();
    removeEventListener('keydown', onKey, true);
  };
  const pick = (t: BType) => {
    close();
    o.pick(t);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'b' || e.key === 'B') close();
    else if (e.key === 'Enter' && shown) pick(shown);
    else {
      if (/^[1-9]$/.test(e.key)) close(); // the game picks that building itself
      return;
    }
    e.preventDefault();
    e.stopPropagation();
  };

  for (const b of box.querySelectorAll<HTMLButtonElement>('.tile')) {
    const t = b.dataset.type as BType;
    b.onmouseenter = () => { if (!o.touch) show(t); };
    b.onclick = () => (o.touch && shown !== t ? show(t) : pick(t));
  }
  go.onclick = () => shown && pick(shown);
  box.querySelector<HTMLButtonElement>('.close')!.onclick = close;
  box.onclick = (e) => { if (e.target === box) close(); };
  addEventListener('keydown', onKey, true);
  document.body.appendChild(box);
  show(o.current ?? GROUPS[0].types[0]);
}
