import { Game, BDEFS, BUILDABLE, BType, Good, RECIPES, CROP_GROW } from './game';

export const GOOD_NAME: Record<Good, string> = {
  log: 'Logs', plank: 'Planks', stone: 'Stone', fish: 'Fish', grain: 'Grain', flour: 'Flour', bread: 'Bread',
};
const ONE: Record<Good, string> = {
  log: 'Log', plank: 'Plank', stone: 'Stone', fish: 'Fish', grain: 'Grain', flour: 'Flour', bread: 'Bread',
};

// Huts whose worker walks out and brings a good home, and where that good comes from.
const GATHER: Partial<Record<BType, { good: Good; from: string }>> = {
  woodcutter: { good: 'log', from: 'grown trees' },
  quarry: { good: 'stone', from: 'boulders' },
  fisher: { good: 'fish', from: 'the shore' },
  farm: { good: 'grain', from: `fields it sows on free grass. Grain ripens in ${CROP_GROW} s` },
};

// What a building is worth beyond the goods it makes.
const WORTH: Partial<Record<BType, string>> = {
  woodcutter: "Trees run out unless a Forester's Hut replants them.",
  forester: 'Without one, your woodcutters run out of trees.',
  quarry: 'Boulders run out. A Stone Mine never does.',
  lookout: `Grows your land by ${BDEFS.lookout.radius} tiles around the tower, so you have room for more buildings.`,
  storehouse: 'Carriers take goods to the nearest store, so trips get shorter and goods arrive sooner.',
  mine: 'Never runs dry, unlike the boulders a Quarry breaks.',
};

const PLACE: Partial<Record<BType, string>> = {
  fisher: 'Build it near water.',
  mine: 'Build it next to a mountain.',
};

const list = (names: string[], join = 'and') =>
  names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} ${join} ${names[names.length - 1]}`;
const bname = (t: BType) => BDEFS[t].name;

// The good a building makes, if any.
export function makes(type: BType): Good | null {
  return GATHER[type]?.good ?? RECIPES[type]?.to ?? null;
}

export const producers = (g: Good) => BUILDABLE.filter((t) => makes(t) === g);
export const consumers = (g: Good) => BUILDABLE.filter((t) => RECIPES[t]?.from.includes(g));
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

  let what = def.desc;
  if (rc) {
    const perMin = Math.round((60 / rc.t) * rc.n);
    const from = list(rc.from.map((g) => ONE[g]), 'or');
    what = `Turns 1 ${from} into ${rc.n} ${rc.n === 1 ? ONE[rc.to] : GOOD_NAME[rc.to]} every ${rc.t} s. That is up to ${perMin} a minute.`;
  } else if (gather) what = `Brings home ${GOOD_NAME[gather.good]} from ${gather.from}.`;

  const worth: string[] = [];
  if (out) {
    const users = buildersOf(out);
    if (users.length === BUILDABLE.length) worth.push(`Every building needs ${GOOD_NAME[out]}.`);
    else if (users.length) worth.push(`${users.length} of ${BUILDABLE.length} buildings need ${GOOD_NAME[out]} to be built.`);
    const eat = consumers(out).filter((t) => t !== type);
    if (eat.length) worth.push(`${GOOD_NAME[out]} ${GOOD_NAME[out].endsWith('s') ? 'feed' : 'feeds'} the ${list(eat.map(bname))}.`);
  }
  if (WORTH[type]) worth.push(WORTH[type]!);

  const needs: string[] = [];
  if (PLACE[type]) needs.push(PLACE[type]!);
  if (def.worker) needs.push('Takes 1 idle settler as its worker.');
  else needs.push('Needs no worker.');
  if (def.radius && type !== 'lookout' && type !== 'mine') needs.push(`Works up to ${def.radius} tiles away.`);
  needs.push(`Takes ${def.buildTime} s to build once its materials arrive.`);

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
  const c = count(type);
  const have = !c.all ? 'You have none yet.'
    : `You have ${c.built} built${c.planned ? ` and ${c.planned} being built` : ''}.`;

  const warn: string[] = [];
  const rc = RECIPES[type];
  if (rc && rc.from.every((g) => !game.stored[g] && producers(g).every((t) => !count(t).all))) {
    const src = [...new Set(rc.from.flatMap(producers))].map(bname);
    warn.push(`You make no ${list(rc.from.map((g) => GOOD_NAME[g]), 'or')} yet. Build a ${list(src, 'or')} first.`);
  }
  if (type === 'forester' && !count('woodcutter').all) warn.push("New trees only help once a Woodcutter's Hut fells them.");
  if (!game.pool && BDEFS[type].worker) warn.push('No idle settlers right now. It will wait for a worker.');
  return { have, warn };
}
