// The things the game keeps track of: buildings, settlers, and the goods carriers move.
import type { P } from '../path';
import type { Anim, Bag, BType, Good, Role } from './defs';

export interface Building {
  id: number;
  type: BType;
  x: number;
  y: number;
  built: boolean;
  progress: number; // construction 0..1
  stock: Bag; // construction materials, production inputs, or stored goods (HQ and storehouses)
  out: Bag; // finished goods waiting for a carrier
  incoming: Bag; // goods a carrier is bringing here
  sending: Bag; // goods in `out` (or a store's `stock`) that a carrier is coming to fetch
  worker: number;
  builder: number;
  busy: boolean;
  using: Good | null; // the input a workshop is working on right now
  status: string;
  born: number; // settlers a house has added so far
  grow: number; // seconds until a house's next settler, while it is eating
  landed?: boolean; // a harbour your settlers built where their ship landed: a home, like the HQ
  crew?: number; // idle settlers waiting inside a landing harbour
  tooled?: boolean; // a worker brought this hut its tool, which stays here
}

// One trip for a carrier: fetch good `g` from building `from` and bring it to building `to`.
export interface Job {
  from: number;
  to: number;
  g: Good;
  n?: number; // how many of the good, 1 if not given; a pack donkey carries 2
}

export type Task =
  | { k: 'walk'; x: number; y: number; adjacent?: boolean; via?: P[] }
  | { k: 'work'; t: number; anim?: Anim }
  | { k: 'do'; f: () => boolean | void };

export interface Settler {
  id: number;
  role: Role;
  x: number;
  y: number;
  path: P[] | null;
  tasks: Task[];
  carrying: Good | null;
  load?: number; // how many of `carrying` are in hand, 1 if not given
  donkey?: boolean; // a pack donkey, not a settler: it lives in the game's `donkeys`
  job: Job | null; // a carrier's current trip
  home: number; // building a worker or builder belongs to
  base: number; // the HQ or landing harbour the settler came out of, and goes back to
  toolFrom?: number; // the store a new worker is walking to for their tool
  inside: boolean;
  atWork: boolean;
  returning: boolean;
  walking: boolean;
  anim: Anim;
  facing: 1 | -1;
  onAbort: (() => void) | null;
}

export type AnimalKind = 'deer' | 'hare' | 'fox';

// A wild animal. It roams near its home spot, grazes, and steps aside when a settler comes close.
// A hunter can catch deer and hares.
export interface Animal {
  id: number;
  kind: AnimalKind;
  x: number;
  y: number;
  home: P; // the spot it roams around
  path: P[] | null;
  wait: number; // seconds left grazing or resting before it moves on
  fleeing: boolean; // stepping aside from a settler
  facing: 1 | -1;
  hunter: number; // the settler stalking it, or 0
}

// A ship sailing from a harbour to settle the other island, then back again. It ties up at
// its harbour's dock once it is home.
export interface Ship {
  id: number;
  harbour: number; // the harbour it sails from and back to
  x: number;
  y: number;
  path: P[]; // the water tiles still ahead
  leg: 'out' | 'back' | 'moored';
  crew: number; // settlers on board
  cargo: Bag; // goods on board
  land: P; // the tile where the settlers build their harbour
}

// The trade ship. It sails in from the edge of the map, ties up at a harbour for a while, then
// sails off again.
export interface Trader {
  harbour: number; // the harbour it visits
  x: number;
  y: number;
  path: P[]; // the water tiles still ahead
  leg: 'in' | 'docked' | 'out';
  left: number; // seconds it stays tied up
}
