// The food hint a new island shows at the start: what workers eat, and which hut to build for it.
import { getLang } from '../i18n';

const EN = "Your workers eat Fish, Meat or Bread, or they work at half speed. Build a Fisher's Hut near the shore early.";
const PL = 'Pracownicy jedzą ryby, mięso lub chleb, inaczej pracują o połowę wolniej. Wcześnie zbuduj Chatę rybaka blisko brzegu.';

export const foodHint = () => (getLang() === 'pl' ? PL : EN);

// How long the hint stays on screen, in milliseconds. It is longer than other messages, so there is time to read it.
export const FOOD_HINT_MS = 9000;
