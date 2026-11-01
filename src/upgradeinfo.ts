// The part of a building's panel about its upgrade: what it does, what it costs, and the button
// that spends the iron and tools. An upgraded building's panel says so instead.
import { Game, Building, Good, HOUSE_EXTRA, UPGRADE_COST, houseSize, upgradable, upgraded } from './game';
import { getLang, goodName, tr } from './i18n';

const EN = {
  head: '⬆️ Upgrade',
  hut: 'Spend iron and tools from your stores, and the worker here takes half as long over each piece of work.',
  house: `Spend iron and tools from your stores, and this house has room for ${HOUSE_EXTRA} more settlers.`,
  doneHut: '⬆️ Upgraded: the worker takes half as long over each piece of work',
  doneHouse: (n: number) => `⬆️ Upgraded: room for ${n} settlers`,
  button: '⬆️ Upgrade',
};

const PL: typeof EN = {
  head: '⬆️ Ulepszenie',
  hut: 'Wydaj żelazo i narzędzia z magazynów, a pracownik zrobi tu każdą pracę w połowę krótszym czasie.',
  house: `Wydaj żelazo i narzędzia z magazynów, a w tym domu zmieści się o ${HOUSE_EXTRA} osadników więcej.`,
  doneHut: '⬆️ Ulepszony: pracownik robi każdą pracę w połowę krótszym czasie',
  doneHouse: (n) => `⬆️ Ulepszony: miejsce dla ${n} osadników`,
  button: '⬆️ Ulepsz',
};

const text = () => (getLang() === 'pl' ? PL : EN);

// The rows for a finished building's panel, as HTML. Buildings that can't be upgraded show none.
export function upgradeRows(g: Game, b: Building): string {
  if (!b.built || !upgradable(b.type)) return '';
  const x = text(), house = b.type === 'house';
  if (upgraded(b)) return `<div class="upgraded">${house ? x.doneHouse(houseSize(b)) : x.doneHut}</div>`;
  const cost = (Object.keys(UPGRADE_COST) as Good[])
    .map((k) => `<div><span class="good ${k}"></span>${goodName(k)}: ${UPGRADE_COST[k]}</div>`).join('');
  const why = g.canUpgrade(b);
  return `<h4>${x.head}</h4><p class="desc">${house ? x.house : x.hut}</p>${cost}` +
    (why ? `<p class="warn">${tr(why)}</p>` : '') +
    `<button class="sail" data-act="upgrade"${why ? ' disabled' : ''}>${x.button}</button>`;
}
