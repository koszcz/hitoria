import { Game, type Bag, BDEFS, BUILDABLE, BType, Good, MINES, RECIPES, CROP_GROW, DOCK_REACH, HOUSE_FOOD, WELL_DRAW, needsTool, MEAL, SELF_FED, hungryWorker } from './game';
import { getLang, goodName, buildingName, buildingDesc, join, plural } from './i18n';

const bname = (t: BType) => buildingName(t);

// Where a gathering hut's worker finds its good.
type Gather = { good: Good; from: { en: string; pl: string } };
const GATHER: Partial<Record<BType, Gather>> = {
  woodcutter: { good: 'log', from: { en: 'grown trees', pl: 'z dorosłych drzew' } },
  quarry: { good: 'stone', from: { en: 'boulders', pl: 'z głazów' } },
  fisher: { good: 'fish', from: { en: 'the shore', pl: 'z brzegu' } },
  hunter: { good: 'meat', from: { en: `deer and hares up to ${BDEFS.hunter.radius} tiles away`, pl: `z polowań na jelenie i zające do ${BDEFS.hunter.radius} pól od chaty` } },
  farm: {
    good: 'grain',
    from: {
      en: `fields it sows on free grass. Grain ripens in ${CROP_GROW} s, and grows only from spring to autumn`,
      pl: `z pól, które obsiewa na wolnej trawie. Zboże dojrzewa w ${CROP_GROW} s i rośnie tylko od wiosny do jesieni`,
    },
  },
};

// One of a good, for the recipe line.
const ONE_EN: Record<Good, string> = {
  log: 'Log', plank: 'Plank', stone: 'Stone', fish: 'Fish', grain: 'Grain', flour: 'Flour', bread: 'Bread', water: 'Water', coal: 'Coal', ore: 'Iron Ore', meat: 'Meat', iron: 'Iron', tool: 'Tool',
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
  water: ['wiadro wody', 'wiadra wody', 'wiader wody'],
  coal: ['worek węgla', 'worki węgla', 'worków węgla'],
  ore: ['bryłę rudy żelaza', 'bryły rudy żelaza', 'brył rudy żelaza'],
  meat: ['porcję mięsa', 'porcje mięsa', 'porcji mięsa'],
  iron: ['sztabkę żelaza', 'sztabki żelaza', 'sztabek żelaza'],
  tool: ['narzędzie', 'narzędzia', 'narzędzi'],
};
// Polish goods whose name is plural ("Kłody zasilają"), not singular ("Kamień zasila").
const PLURAL_PL: Partial<Record<Good, true>> = { log: true, plank: true, fish: true, tool: true };

const EN = {
  recipe: (from: Good[], also: Good[], n: number, to: Good, t: number, perMin: number) =>
    `Turns ${join([join(from.map((g) => ONE_EN[g]), 'or'), ...also.map((g) => ONE_EN[g])].map((s) => `1 ${s}`), 'and')} into ${n} ${n === 1 ? ONE_EN[to] : goodName(to)} every ${t} s. That is up to ${perMin} a minute.`,
  draw: `Draws 1 Water from the ground every ${WELL_DRAW} s. It needs no other goods.`,
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
    monument: 'Your last goal. Build it once your island is thriving.',
    harbour: 'A ship sails from here to settle the other island. A trade ship visits each morning and leaves before sunset. It also stores goods.',
    toolmaker: 'Every new worker in a hut needs 1 tool. When the tools you started with run out, new huts wait for one. The workshop gets the next free tool before any other hut.',
    geologist: 'Shows you where to put your mines. A mine next to a gold sign digs twice as fast.',
    square: 'A wedding feast brings 2 new settlers, and it costs no house. A religious feast makes everyone work 25% faster for a day.',
  } as Partial<Record<BType, string>>,
  place: {
    fisher: 'Build it near water.',
    mine: 'Build it next to a mountain, or on its edge with grass in front.',
    geologist: 'Build it near a mountain.',
    harbour: `Build it on the shore, up to ${DOCK_REACH} tiles from open water.`,
  } as Partial<Record<'fisher' | 'mine' | 'harbour' | 'geologist', string>>,
  worker: 'Takes 1 idle settler as its worker.',
  eats: `Its worker eats 1 Fish, Meat or Bread every ${MEAL} s of work. With no food, they work at half speed.`,
  eatsOwn: `Its worker eats from what the hut makes, 1 every ${MEAL} s of work.`,
  workerTool: 'Takes 1 idle settler as its worker, and 1 tool from your stores.',
  noWorker: 'Needs no worker.',
  range: (n: number) => `Works up to ${n} tiles away.`,
  buildTime: (s: number) => `Takes ${s} s to build once its materials arrive.`,
  none: 'You have none yet.',
  have: (built: number, planned: number) => `You have ${built} built${planned ? ` and ${planned} being built` : ''}.`,
  noInput: (from: Good[], src: BType[]) =>
    `You make no ${join(from.map(goodName), 'or')} yet. Build ${/^[AEIOU]/.test(bname(src[0])) ? 'an' : 'a'} ${join(src.map(bname), 'or')} first.`,
  noWoodcutter: "New trees only help once a Woodcutter's Hut fells them.",
  noIdle: 'No idle settlers right now. It will wait for a worker.',
  unused: (g: Good) => `Nothing uses ${goodName(g)} yet. It waits in your stores.`,
  noTool: "You have no tools left. Its worker will wait until a Toolmaker's Workshop makes one.",
};

const PL: typeof EN = {
  recipe: (from, also, n, to, t, perMin) =>
    `Zamienia ${join([join(from.map((g) => COUNT_PL[g][0]), 'lub'), ...also.map((g) => COUNT_PL[g][0])].map((s) => `1 ${s}`), 'i')} na ${n} ${plural(n, ...COUNT_PL[to])} co ${t} s. To do ${perMin} na minutę.`,
  draw: `Czerpie z ziemi 1 wiadro wody co ${WELL_DRAW} s. Nie potrzebuje innych towarów.`,
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
    monument: 'Twój ostatni cel. Zbuduj go, gdy twoja wyspa kwitnie.',
    harbour: 'Stąd statek wypływa, by osiedlić drugą wyspę. Co rano przypływa statek kupiecki i odpływa przed zachodem słońca. Port przechowuje też towary.',
    toolmaker: 'Każdy nowy pracownik potrzebuje 1 narzędzia. Gdy skończą się narzędzia z początku gry, nowe budynki czekają na nowe. Warsztat dostaje następne wolne narzędzie przed innymi budynkami.',
    geologist: 'Pokazuje, gdzie stawiać kopalnie. Kopalnia obok złotego znaku wydobywa dwa razy szybciej.',
    square: 'Uczta weselna sprowadza 2 nowych osadników i nie potrzebuje domu. Uczta religijna sprawia, że przez dzień wszyscy pracują o 25% szybciej.',
  },
  place: { fisher: 'Zbuduj ją blisko wody.', mine: 'Zbuduj ją przy górze albo na jej skraju, z trawą przed wejściem.', geologist: 'Zbuduj ją blisko góry.', harbour: `Zbuduj go na brzegu, do ${DOCK_REACH} pól od otwartej wody.` },
  worker: 'Zatrudnia 1 wolnego osadnika.',
  eats: `Pracownik zjada 1 rybę, porcję mięsa lub bochenek chleba co ${MEAL} s pracy. Bez jedzenia pracuje o połowę wolniej.`,
  eatsOwn: `Pracownik je to, co wytwarza budynek: 1 sztukę co ${MEAL} s pracy.`,
  workerTool: 'Zatrudnia 1 wolnego osadnika i bierze 1 narzędzie z magazynu.',
  noWorker: 'Nie potrzebuje pracownika.',
  range: (n) => `Pracuje do ${n} ${plural(n, 'pola', 'pól', 'pól')} od siebie.`,
  buildTime: (s) => `Budowa trwa ${s} s od dostarczenia materiałów.`,
  none: 'Nie masz jeszcze żadnego.',
  have: (built, planned) => `Gotowe: ${built}${planned ? `, w budowie: ${planned}` : ''}.`,
  noInput: (from, src) =>
    `Nic jeszcze nie wytwarza: ${join(from.map(goodName), 'lub')}. Najpierw zbuduj: ${join(src.map(bname), 'lub')}.`,
  noWoodcutter: 'Nowe drzewa przydadzą się dopiero, gdy zetnie je Chata drwala.',
  noIdle: 'Nie ma teraz wolnych osadników. Budynek poczeka na pracownika.',
  unused: (g) => `${goodName(g)} jeszcze się do niczego nie przydaje. Czeka w twoich magazynach.`,
  noTool: 'Nie masz już narzędzi. Pracownik poczeka, aż Warsztat narzędziarza zrobi nowe.',
};

const text = () => (getLang() === 'pl' ? PL : EN);

// The good a building makes, if any.
export function makes(type: BType): Good | null {
  if (type === 'well') return 'water';
  return GATHER[type]?.good ?? RECIPES[type]?.to ?? null;
}

export const producers = (g: Good) => BUILDABLE.filter((t) => makes(t) === g);
// The goods a building uses up: a workshop's inputs, or a house's food.
const eats = (t: BType): Good[] => needs(t).flat();
// What a building uses up, as groups: it needs one good from every group.
const needs = (t: BType): Good[][] => {
  const rc = RECIPES[t];
  if (rc) return rc.with ? [rc.from, [rc.with]] : [rc.from];
  return t === 'house' ? [HOUSE_FOOD] : [];
};
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
  if (rc) what = x.recipe(rc.from, rc.with ? [rc.with] : [], rc.n, rc.to, rc.t, Math.round((60 / rc.t) * rc.n));
  else if (gather) what = x.gather(gather);
  else if (type === 'well') what = x.draw;

  const worth: string[] = [];
  if (out) {
    const users = buildersOf(out);
    if (users.length === BUILDABLE.length) worth.push(x.everyNeeds(out));
    else if (users.length) worth.push(x.someNeed(users.length, BUILDABLE.length, out));
    const eat = consumers(out).filter((t) => t !== type);
    if (eat.length) worth.push(x.feeds(out, eat));
    else if (!users.length && out !== 'tool') worth.push(x.unused(out)); // tools go to new workers
  }
  if (x.worth[type]) worth.push(x.worth[type]!);

  const needs: string[] = [];
  const place = MINES.includes(type) ? x.place.mine : type === 'fisher' || type === 'harbour' || type === 'geologist' ? x.place[type] : undefined;
  if (place) needs.push(place);
  needs.push(!def.worker ? x.noWorker : needsTool(type) ? x.workerTool : x.worker);
  if (hungryWorker(type)) needs.push(SELF_FED.includes(type) ? x.eatsOwn : x.eats);
  if (def.radius && type !== 'lookout' && !MINES.includes(type)) needs.push(x.range(def.radius));
  needs.push(x.buildTime(def.buildTime));

  return { makes: what, worth, needs };
}

// Notes about the game you are playing: how many you have and what is missing.
export interface BuildNow {
  have: string;
  warn: string[];
}

// `stored` is the goods on the island the player looks at.
export function buildNow(game: Game, type: BType, stored: Bag = game.stored): BuildNow {
  const count = (t: BType) => {
    let built = 0, planned = 0;
    for (const b of game.buildings.values()) if (b.type === t) b.built ? built++ : planned++;
    return { built, planned, all: built + planned };
  };
  const x = text();
  const c = count(type);
  const have = !c.all ? x.none : x.have(c.built, c.planned);

  const warn: string[] = [];
  for (const from of needs(type))
    if (from.every((g) => !stored[g] && producers(g).every((t) => !count(t).all)))
      warn.push(x.noInput(from, [...new Set(from.flatMap(producers))]));
  if (type === 'forester' && !count('woodcutter').all) warn.push(x.noWoodcutter);
  if (!game.pool && BDEFS[type].worker) warn.push(x.noIdle);
  if (needsTool(type) && !stored.tool) warn.push(x.noTool);
  return { have, warn };
}
