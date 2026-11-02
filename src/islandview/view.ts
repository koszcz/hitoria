// Which island's goods the stock bar and build menu show: the island the camera looks at. Once
// more than one island has a store, the bar names the island, so the player knows which goods they see.
import type { Bag, Game } from '../game';
import { storeIsles, storedOn, viewedIsle, type Isle } from '../game/islandstock';
import { getLang } from '../i18n';

const EN: Record<Isle, string> = { home: 'Home island', other: 'Second island', far: 'Far island' };
const PL: Record<Isle, string> = { home: 'Wyspa domowa', other: 'Druga wyspa', far: 'Daleka wyspa' };

export interface IsleView {
  isle: Isle;
  stored: Bag; // the goods in that island's stores
  label: string; // the island's name, or '' while only one island has a store
}

// What to show while the camera looks at the tile at (x, y).
export function isleView(g: Game, x: number, y: number): IsleView {
  const isle = viewedIsle(g, x, y);
  const label = storeIsles(g).length > 1 ? (getLang() === 'pl' ? PL : EN)[isle] : '';
  return { isle, stored: storedOn(g, isle), label };
}
