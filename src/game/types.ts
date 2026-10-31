// The things the game keeps track of: buildings, flags, roads, settlers, and the goods carriers move.
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
}

// One trip for a carrier: fetch good `g` from building `from` and bring it to building `to`.
export interface Job {
  from: number;
  to: number;
  g: Good;
}

// Flags mark the ends of roads and the places where roads meet. Goods never wait on them.
export interface Flag {
  id: number;
  x: number;
  y: number;
  roads: number[];
  building: number;
}

// A road runs between two flags; `path` includes both flag tiles.
export interface Road {
  id: number;
  a: number;
  b: number;
  path: P[];
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
  job: Job | null; // a carrier's current trip
  home: number; // building a worker or builder belongs to
  inside: boolean;
  atWork: boolean;
  returning: boolean;
  walking: boolean;
  anim: Anim;
  facing: 1 | -1;
  onAbort: (() => void) | null;
}
