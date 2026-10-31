// The details for one building: what it makes, why to build it, what it needs and what it costs.
import { BDEFS, GOODS, type Bag, type BType, type Game } from '../game';
import { buildFacts, buildNow } from '../buildinfo';
import { T, buildingName } from '../i18n';
import { keyFor } from './groups';

export const costText = (cost: Partial<Bag>) =>
  GOODS.filter((g) => cost[g]).map((g) => `<span class="good ${g}"></span>${cost[g]}`).join(' ');

export function cardHtml(game: Game, type: BType) {
  const def = BDEFS[type];
  const facts = buildFacts(type);
  const now = buildNow(game, type);
  const key = keyFor(type);
  const items = (xs: string[]) => xs.map((x) => `<li>${x}</li>`).join('');
  const x = T();
  return (
    `<h3><span class="icon">${def.icon}</span>${buildingName(type)}${key ? `<kbd>${key}</kbd>` : ''}</h3>` +
    `<p class="makes">${facts.makes}</p>` +
    (facts.worth.length ? `<h4>${x.whyBuild}</h4><ul>${items(facts.worth)}</ul>` : '') +
    `<h4>${x.whatNeeds}</h4><ul>${items(facts.needs)}</ul>` +
    `<p class="costline">${x.costs} ${costText(def.cost)}</p>` +
    `<p class="have">${now.have}</p>` +
    now.warn.map((w) => `<p class="warn">⚠ ${w}</p>`).join('')
  );
}
