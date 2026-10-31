// The things the game keeps track of: buildings, flags, roads, the goods on them, and settlers.
import type { P } from '../path';
import type { Anim, Bag, BType, Good, Role } from './defs';

export interface Building {
  id: number;
  type: BType;
  x: number;
  y: number;
  flag: number; // the flag in front of the door, at (x, y + 1)
  built: boolean;
  progress: number; // construction 0..1
  stock: Bag; // construction materials, production inputs, or stored goods (HQ and storehouses)
  out: Bag; // finished goods waiting for room on the flag
  incoming: Bag; // goods already routed here
  worker: number;
  builder: number;
  busy: boolean;
  using: Good | null; // the input a workshop is working on right now
  status: string;
  born: number; // settlers a house has added so far
  grow: number; // seconds until a house's next settler, while it is eating
}

// A good lying on a flag, on its way to building `dest` (0 = not decided yet).
export interface Item {
  g: Good;
  dest: number;
}

export interface Flag {
  id: number;
  x: number;
  y: number;
  items: Item[];
  roads: number[];
  building: number;
}

// A road runs between two flags; `path` includes both flag tiles. One carrier works each road.
export interface Road {
  id: number;
  a: number;
  b: number;
  path: P[];
  carrier: number;
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
  item: Item | null; // what a road carrier holds
  ri: number; // a road carrier's index along its road
  since: number; // game time a road carrier last had something to do
  home: number; // building, or road for carriers
  inside: boolean;
  atWork: boolean;
  returning: boolean;
  walking: boolean;
  anim: Anim;
  facing: 1 | -1;
  onAbort: (() => void) | null;
}
