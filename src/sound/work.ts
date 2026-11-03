// Which work sounds play, and how loud: chopping, sawing and hammering near the listener.
// Pure functions, so the rules can be tested without a browser.
import type { BType, Game } from '../game';

export type WorkKind = 'chop' | 'saw' | 'hammer';
export const WORK_KINDS: WorkKind[] = ['chop', 'saw', 'hammer'];

// One spot where someone works and makes a sound, in tile coordinates.
export interface WorkSource {
  kind: WorkKind;
  x: number;
  y: number;
}

// Workshops whose work you hear while they work on something, at the building.
const WORKSHOPS: Partial<Record<BType, WorkKind>> = { sawmill: 'saw', toolmaker: 'hammer' };

// Every work sound in the game right now: woodcutters chop, builders and stonecutters hammer,
// the sawmill saws and the toolmaker hammers.
export function workSources(g: Game): WorkSource[] {
  const out: WorkSource[] = [];
  for (const s of g.settlers.values()) {
    const kind = s.anim === 'chop' ? 'chop' : s.anim === 'hammer' || s.anim === 'mine' ? 'hammer' : null;
    if (kind) out.push({ kind, x: s.x, y: s.y });
  }
  for (const b of g.buildings.values()) {
    const kind = WORKSHOPS[b.type];
    if (kind && b.built && b.busy) out.push({ kind, x: b.x, y: b.y });
  }
  return out;
}

export interface Listener {
  x: number; // the point you hear from, in tile coordinates: the mouse pointer or the screen's middle
  y: number;
  zoom: number; // the camera zoom; smaller is further away
  muted: boolean;
}

const HEAR = 14; // tiles: work further from the listener than this is not heard
const MAX_WORK = 0.4; // loudest each work sound gets
const NEAR_ZOOM = 1.3; // the zoom a new game starts at
const FAR_ZOOM = 0.4; // at this zoom or further out, work is too far away to hear

// How much one source adds to its sound, from 1 at the listener to 0 at `HEAR` tiles or further.
export function nearness(s: WorkSource, v: { x: number; y: number }) {
  const d = Math.hypot(s.x - v.x, s.y - v.y);
  return d < HEAR ? (1 - d / HEAR) ** 2 : 0;
}

// The volume of each work sound, from 0 to 1. Nearer work is louder. More workers are louder,
// but the sound levels off, so a busy town never gets loud.
export function workMix(sources: WorkSource[], v: Listener): Record<WorkKind, number> {
  const out = { chop: 0, saw: 0, hammer: 0 };
  if (v.muted) return out;
  const zoom = Math.min(1, Math.max(0, (v.zoom - FAR_ZOOM) / (NEAR_ZOOM - FAR_ZOOM)));
  if (zoom === 0) return out;
  const sum = { chop: 0, saw: 0, hammer: 0 };
  for (const s of sources) sum[s.kind] += nearness(s, v);
  for (const k of WORK_KINDS) out[k] = MAX_WORK * (1 - Math.exp(-1.2 * sum[k])) * zoom;
  return out;
}

// The times of the beats to plan now: from `next` up to `ahead` seconds past `now`, one every
// `every` seconds. A `next` in the past (the tab was hidden) starts again from now.
// Returns the beats and when the beat after them falls.
export function beats(next: number, now: number, ahead: number, every: number) {
  const at: number[] = [];
  if (next < now) next = now;
  while (next < now + ahead) {
    at.push(Math.round(next * 1e6) / 1e6);
    next += every;
  }
  return { at, next: Math.round(next * 1e6) / 1e6 };
}
