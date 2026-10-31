// Goods, roles and building types, with the costs, recipes and timings that tune the game.
export type Good = 'log' | 'plank' | 'stone' | 'fish' | 'grain' | 'flour' | 'bread' | 'water';
export const GOODS: Good[] = ['log', 'plank', 'stone', 'fish', 'grain', 'flour', 'bread', 'water'];
export type Bag = Record<Good, number>;
export const bag = (p: Partial<Bag> = {}): Bag => ({ log: 0, plank: 0, stone: 0, fish: 0, grain: 0, flour: 0, bread: 0, water: 0, ...p });

export type Role = 'carrier' | 'builder' | 'woodcutter' | 'forester' | 'stonecutter' | 'sawyer' | 'scout'
  | 'fisher' | 'farmer' | 'miller' | 'baker' | 'miner' | 'drawer';
export type BType = 'hq' | 'woodcutter' | 'forester' | 'quarry' | 'sawmill' | 'lookout' | 'storehouse'
  | 'fisher' | 'farm' | 'well' | 'mill' | 'bakery' | 'mine' | 'house' | 'monument';
export type Anim = '' | 'chop' | 'mine' | 'hammer' | 'plant' | 'fish' | 'reap';

// Houses grow your number of settlers.
export const HOUSE_FOOD: Good[] = ['fish', 'bread'];
export const HOUSE_PANTRY = 2; // food a house keeps on hand
export const HOUSE_GROW = 40; // seconds from eating to a new settler
export const HOUSE_SIZE = 4; // settlers one house adds in all

export interface BDef {
  name: string;
  icon: string;
  desc: string;
  cost: Partial<Bag>;
  buildTime: number; // seconds of hammering once all materials are on site
  worker: Role | null;
  radius: number; // work radius, or land radius for hq/lookout
}

export const BDEFS: Record<BType, BDef> = {
  hq: { name: 'Headquarters', icon: '🏰', desc: 'Stores all goods and houses idle settlers.', cost: {}, buildTime: 0, worker: null, radius: 9 },
  woodcutter: { name: "Woodcutter's Hut", icon: '🪓', desc: 'Fells grown trees nearby and produces logs.', cost: { plank: 2 }, buildTime: 6, worker: 'woodcutter', radius: 6 },
  forester: { name: "Forester's Hut", icon: '🌱', desc: 'Plants saplings that grow into new trees.', cost: { plank: 2 }, buildTime: 6, worker: 'forester', radius: 5 },
  quarry: { name: 'Quarry', icon: '⛏️', desc: 'Breaks nearby boulders into stone.', cost: { plank: 2 }, buildTime: 6, worker: 'stonecutter', radius: 6 },
  sawmill: { name: 'Sawmill', icon: '🪚', desc: 'Saws logs into planks.', cost: { plank: 2, stone: 2 }, buildTime: 9, worker: 'sawyer', radius: 0 },
  lookout: { name: 'Lookout Tower', icon: '🔭', desc: 'Expands your land. No soldiers, just a view.', cost: { plank: 3, stone: 3 }, buildTime: 10, worker: 'scout', radius: 7 },
  storehouse: { name: 'Storehouse', icon: '📦', desc: 'Stores spare goods close to where they are made and needed.', cost: { plank: 3, stone: 2 }, buildTime: 8, worker: null, radius: 0 },
  fisher: { name: "Fisher's Hut", icon: '🎣', desc: 'Catches fish from the water nearby. Build it close to the shore.', cost: { plank: 2 }, buildTime: 6, worker: 'fisher', radius: 5 },
  farm: { name: 'Farm', icon: '🌾', desc: 'Sows grain on free grass nearby and harvests it when it is ripe.', cost: { plank: 3, stone: 1 }, buildTime: 8, worker: 'farmer', radius: 3 },
  well: { name: 'Well', icon: '🪣', desc: 'Draws water from the ground. Build it on any flat grass.', cost: { plank: 2, stone: 1 }, buildTime: 6, worker: 'drawer', radius: 0 },
  mill: { name: 'Mill', icon: '⚙️', desc: 'Grinds grain into flour.', cost: { plank: 2, stone: 3 }, buildTime: 9, worker: 'miller', radius: 0 },
  bakery: { name: 'Bakery', icon: '🍞', desc: 'Bakes flour and water into bread.', cost: { plank: 2, stone: 2 }, buildTime: 8, worker: 'baker', radius: 0 },
  house: { name: 'House', icon: '🏠', desc: `A family home. It turns one fish or bread into a new settler every ${HOUSE_GROW} s, up to ${HOUSE_SIZE} settlers.`, cost: { plank: 3, stone: 2 }, buildTime: 8, worker: null, radius: 0 },
  monument: { name: 'Monument', icon: '🗿', desc: 'A tall stone monument to your peaceful island. It does no work, but your settlers are proud of it.', cost: { plank: 10, stone: 16 }, buildTime: 30, worker: null, radius: 0 },
  mine: { name: 'Stone Mine', icon: '⛰️', desc: 'Digs stone out of a mountain and never runs dry. The miner eats one fish or bread for every 2 stone. Build it next to a mountain.', cost: { plank: 4 }, buildTime: 10, worker: 'miner', radius: 2 },
};
export const BUILDABLE: BType[] = ['woodcutter', 'forester', 'quarry', 'sawmill', 'lookout', 'storehouse', 'fisher', 'farm', 'mill', 'bakery', 'mine', 'house', 'monument', 'well'];

// Workshops turn goods into other goods inside the building. With several inputs in `from`, any one of them
// will do. The good in `with` is needed as well.
export interface Recipe {
  from: Good[];
  with?: Good;
  lacking?: string; // the status while the `with` good is missing
  to: Good;
  n: number; // goods made from one input
  t: number; // seconds of work
  doing: string;
  waiting: string;
}
export const RECIPES: Partial<Record<BType, Recipe>> = {
  sawmill: { from: ['log'], to: 'plank', n: 1, t: 5, doing: 'Sawing planks', waiting: 'Waiting for logs' },
  mill: { from: ['grain'], to: 'flour', n: 1, t: 5, doing: 'Grinding flour', waiting: 'Waiting for grain' },
  bakery: { from: ['flour'], with: 'water', to: 'bread', n: 1, t: 6, doing: 'Baking bread', waiting: 'Waiting for flour', lacking: 'Waiting for water' },
  mine: { from: ['bread', 'fish'], to: 'stone', n: 2, t: 8, doing: 'Digging stone', waiting: 'Waiting for fish or bread' },
};

export const SPEED = 1.7; // tiles per second
export const ROAD_SPEED = 1.5; // multiplier on roads
export const WELL_DRAW = 5; // seconds to draw one bucket of water
export const PILE = 4; // max finished goods a hut keeps before its worker pauses
export const CROP_GROW = 60; // seconds for sown grain to ripen
export const FARM_FIELDS = 6; // fields every farm keeps for itself
export const PATH_SPEED = 1.25; // multiplier on a fully worn path
export const WEAR_STEP = 0.2; // wear one footstep adds to a tile, out of 1
export const FADE_DELAY = 60; // seconds a path stays fully worn after the last footstep
export const FADE_TIME = 180; // seconds a fully worn path then takes to fade back to grass
