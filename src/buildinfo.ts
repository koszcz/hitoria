import { Game, BDEFS, BUILDABLE, BType, Good, RECIPES, CROP_GROW, HOUSE_FOOD } from './game';
import { getLang, goodName, buildingName, buildingDesc, join, plural } from './i18n';

const bname = (t: BType) => buildingName(t);

// Where a gathering hut's worker finds its good.
type Gather = { good: Good; from: { en: string; pl: string } };
const GATHER: Partial<Record<BType, Gather>> = {
  woodcutter: { good: 'log', from: { en: 'grown trees', pl: 'z dorosłych drzew' } },
  quarry: { good: 'stone', from: { en: 'boulders', pl: 'z głazów' } },
  fisher: { good: 'fish', from: { en: 'the shore', pl: 'z brzegu' } },
  farm: {
    good: 'grain',
    from: {
      en: `fields it sows on free grass. Grain ripens in ${CROP_GROW} s`,
      pl: `z pól, które obsiewa na wolnej trawie. Zboże dojrzewa w ${CROP_GROW} s`,
    },
  },
};

// One of a good, for the recipe line.
const ONE_EN: Record<Good, string> = {
  log: 'Log', plank: 'Plank', stone: 'Stone', fish: 'Fish', grain: 'Grain', flour: 'Flour', bread: 'Bread',
};
// Polish goods counted one by one: the form after 1, after 2–4, and after 5 or more.
const COUNT_PL: Record<Good, [string, string, string]> = {
  log: ['kłodę', 'kłody', 'kłód'],
  plank: ['deskę', 'deski', 'desek'],
  stone: ['kamień', 'kamienie', 'kamieni'],
  fish: ['rybę', 'ryby', 'ryb'],
  grain: ['snop zboża', 'snopy zboża', 'snopów zboża'],
  flour: ['worek mąki', 'worki mąki', 'worków mąki'],
  bread: ['bochenek chleba', 'bochenki chleba', 'bochenków chleba'],
};
// Polish goods whose name is plural ("Kłody zasilają"), not singular ("Kamień zasila").
const PLURAL_PL: Partial<Record<Good, true>> = { log: true, plank: true, fish: true };

const EN = {
  recipe: (from: Good[], n: number, to: Good, t: number, perMin: number) =>
    `Turns 1 ${join(from.map((g) => ONE_EN[g]), 'or')} into ${n} ${n === 1 ? ONE_EN[to] : goodName(to)} every ${t} s. That is up to ${perMin} a minute.`,
  gather: (g: Gather) => `Brings home ${goodName(g.good)} from ${g.from.en}.`,
  everyNeeds: (g: Good) => `Every building needs ${goodName(g)}.`,
  someNeed: (n: number, all: number, g: Good) => `${n} of ${all} buildings need ${goodName(g)} to be built.`,
  feeds: (g: Good, users: BType[]) =>
    `${goodName(g)} ${goodName(g).endsWith('s') ? 'feed' : 'feeds'} the ${join(users.map(bname), 'and')}.`,
  worth: {
    woodcutter: "Trees run out unless a Forester's Hut replants them.",
    forester: 'Without one, your woodcutters run out of trees.',
    quarry: 'Boulders run out. A Stone Mine never does.',
    lookout: `Grows your land by ${BDEFS.lookout.radius} tiles around the tower, so you have room for more buildings.`,
    storehouse: 'Carriers take goods to the nearest store, so trips get shorter and goods arrive sooner.',
    mine: 'Never runs dry, unlike the boulders a Quarry breaks.',
    house: 'More settlers mean more carriers, builders and workers. Build more houses to keep growing.',
  } as Partial<Record<BType, string>>,
  place: { fisher: 'Build it near water.', mine: 'Build it next to a mountain.' } as Partial<Record<BType, string>>,
  worker: 'Takes 1 idle settler as its worker.',
  noWorker: 'Needs no worker.',
  range: (n: number) => `Works up to ${n} tiles away.`,
  buildTime: (s: number) => `Takes ${s} s to build once its materials arrive.`,
  none: 'You have none yet.',
  have: (built: number, planned: number) => `You have ${built} built${planned ? ` and ${planned} being built` : ''}.`,
  noInput: (from: Good[], src: BType[]) =>
    `You make no ${join(from.map(goodName), 'or')} yet. Build a ${join(src.map(bname), 'or')} first.`,
  noWoodcutter: "New trees only help once a Woodcutter's Hut fells them.",
  noIdle: 'No idle settlers right now. It will wait for a worker.',
};

const PL: typeof EN = {
  recipe: (from, n, to, t, perMin) =>
    `Zamienia 1 ${join(from.map((g) => COUNT_PL[g][0]), 'lub')} na ${n} ${plural(n, ...COUNT_PL[to])} co ${t} s. To do ${perMin} na minutę.`,
  gather: (g) => `Przynosi ${goodName(g.good).toLowerCase()} ${g.from.pl}.`,
  everyNeeds: (g) => `Każdy budynek wymaga do budowy materiału: ${goodName(g)}.`,
  someNeed: (n, all, g) => `${n} z ${all} budynków wymaga do budowy materiału: ${goodName(g)}.`,
  feeds: (g, users) => `${goodName(g)} ${PLURAL_PL[g] ? 'zasilają' : 'zasila'}: ${join(users.map(bname), 'i')}.`,
  worth: {
    woodcutter: 'Drzewa się skończą, chyba że Chata leśnika posadzi nowe.',
    forester: 'Bez niej drwalom skończą się drzewa.',
    quarry: 'Głazy się kończą. Kopalnia kamienia nigdy.',
    lookout: `Poszerza twoje ziemie o ${BDEFS.lookout.radius} pól wokół wieży, więc masz miejsce na więcej budynków.`,
    storehouse: 'Tragarze niosą towary do najbliższego magazynu, więc drogi są krótsze, a towary docierają szybciej.',
    mine: 'Nigdy się nie wyczerpuje, w przeciwieństwie do głazów, które rozbija Kamieniołom.',
    house: 'Więcej osadników to więcej tragarzy, budowniczych i pracowników. Buduj kolejne domy, by dalej rosnąć.',
  },
  place: { fisher: 'Zbuduj ją blisko wody.', mine: 'Zbuduj ją przy górze.' },
  worker: 'Zatrudnia 1 wolnego osadnika.',
  noWorker: 'Nie potrzebuje pracownika.',
  range: (n) => `Pracuje do ${n} ${plural(n, 'pola', 'pól', 'pól')} od siebie.`,
  buildTime: (s) => `Budowa trwa ${s} s od dostarczenia materiałów.`,
  none: 'Nie masz jeszcze żadnego.',
  have: (built, planned) => `Gotowe: ${built}${planned ? `, w budowie: ${planned}` : ''}.`,
  noInput: (from, src) =>
    `Nic jeszcze nie wytwarza: ${join(from.map(goodName), 'lub')}. Najpierw zbuduj: ${join(src.map(bname), 'lub')}.`,
  noWoodcutter: 'Nowe drzewa przydadzą się dopiero, gdy zetnie je Chata drwala.',
  noIdle: 'Nie ma teraz wolnych osadników. Budynek poczeka na pracownika.',
};

const text = () => (getLang() === 'pl' ? PL : EN);

// The good a building makes, if any.
export function makes(type: BType): Good | null {
  return GATHER[type]?.good ?? RECIPES[type]?.to ?? null;
}

export const producers = (g: Good) => BUILDABLE.filter((t) => makes(t) === g);
// The goods a building uses up: a workshop's inputs, or a house's food.
const eats = (t: BType): Good[] => RECIPES[t]?.from ?? (t === 'house' ? HOUSE_FOOD : []);
export const consumers = (g: Good) => BUILDABLE.filter((t) => eats(t).includes(g));
export const buildersOf = (g: Good) => BUILDABLE.filter((t) => BDEFS[t].cost[g]);

// The fixed facts about a building type, shown before you place it.
export interface BuildFacts {
  makes: string; // what it does, in one sentence
  worth: string[]; // why you want one
  needs: string[]; // where it goes and who works there
}

export function buildFacts(type: BType): BuildFacts {
  const def = BDEFS[type];
  const out = makes(type);
  const rc = RECIPES[type];
  const gather = GATHER[type];
  const x = text();

  let what = buildingDesc(type);
  if (rc) what = x.recipe(rc.from, rc.n, rc.to, rc.t, Math.round((60 / rc.t) * rc.n));
  else if (gather) what = x.gather(gather);

  const worth: string[] = [];
  if (out) {
    const users = buildersOf(out);
    if (users.length === BUILDABLE.length) worth.push(x.everyNeeds(out));
    else if (users.length) worth.push(x.someNeed(users.length, BUILDABLE.length, out));
    const eat = consumers(out).filter((t) => t !== type);
    if (eat.length) worth.push(x.feeds(out, eat));
  }
  if (x.worth[type]) worth.push(x.worth[type]!);

  const needs: string[] = [];
  if (x.place[type]) needs.push(x.place[type]!);
  needs.push(def.worker ? x.worker : x.noWorker);
  if (def.radius && type !== 'lookout' && type !== 'mine') needs.push(x.range(def.radius));
  needs.push(x.buildTime(def.buildTime));

  return { makes: what, worth, needs };
}

// Notes about the game you are playing: how many you have and what is missing.
export interface BuildNow {
  have: string;
  warn: string[];
}

export function buildNow(game: Game, type: BType): BuildNow {
  const count = (t: BType) => {
    let built = 0, planned = 0;
    for (const b of game.buildings.values()) if (b.type === t) b.built ? built++ : planned++;
    return { built, planned, all: built + planned };
  };
  const x = text();
  const c = count(type);
  const have = !c.all ? x.none : x.have(c.built, c.planned);

  const warn: string[] = [];
  const from = eats(type);
  if (from.length && from.every((g) => !game.stored[g] && producers(g).every((t) => !count(t).all)))
    warn.push(x.noInput(from, [...new Set(from.flatMap(producers))]));
  if (type === 'forester' && !count('woodcutter').all) warn.push(x.noWoodcutter);
  if (!game.pool && BDEFS[type].worker) warn.push(x.noIdle);
  return { have, warn };
}
