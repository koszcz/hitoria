// What a settler does next when they have nothing to do: each worker's job at their hut, and which tile to work on.
import type { P } from '../path';
import { W, Tile } from '../world';
import { BDEFS, Good, PILE, RECIPES, WELL_DRAW } from './defs';
import { carry } from './carriers';
import type { Game } from './game';
import { near, plantable } from './land';
import type { Building, Settler } from './types';

export function idle(g: Game, s: Settler) {
  if (s.role === 'carrier') return carry(g, s);
  const home = g.buildings.get(s.home);
  if (!home || s.role === 'builder') return;
  const rest = (t: number, status: string) => {
    home.status = status;
    s.tasks = [{ k: 'work', t }];
  };
  const r = BDEFS[home.type].radius;
  const free = (t: Tile, x: number, y: number) => plantable(g, t, x, y);
  // A finished good goes onto the hut's pile, and counts toward the goods the settlement has made.
  const make = (good: Good, n = 1) => {
    home.out[good] += n;
    g.made[good] += n;
  };

  switch (s.role) {
    case 'woodcutter':
    case 'stonecutter': {
      const wood = s.role === 'woodcutter';
      const good: Good = wood ? 'log' : 'stone';
      if (home.out[good] >= PILE) return rest(2, 'Full, waiting for a carrier');
      const at = findTile(g, home, r, (t) => (wood ? t.tree >= 1 : t.rock > 0));
      if (!at) return rest(3, wood ? 'No grown trees in range' : 'No boulders in range');
      home.status = wood ? 'Felling a tree' : 'Breaking stone';
      const i = claim(g, s, at);
      const tile = g.world.at(at.x, at.y);
      s.tasks = [
        { k: 'walk', ...at, adjacent: true },
        { k: 'work', t: wood ? 3.5 : 4, anim: wood ? 'chop' : 'mine' },
        { k: 'do', f: () => {
          g.claimed.delete(i);
          if (wood) tile.tree = 0; else tile.rock--;
          s.carrying = good;
        } },
        { k: 'walk', x: home.x, y: home.y },
        { k: 'do', f: () => { s.carrying = null; s.onAbort = null; s.inside = true; make(good); } },
        { k: 'work', t: 1.5 },
      ];
      return;
    }
    case 'forester': {
      const at = findTile(g, home, r, free, true);
      if (!at) return rest(4, 'No free ground to plant on');
      home.status = 'Planting a tree';
      const i = claim(g, s, at);
      const tile = g.world.at(at.x, at.y);
      s.tasks = [
        { k: 'walk', ...at },
        { k: 'work', t: 2.5, anim: 'plant' },
        { k: 'do', f: () => {
          g.claimed.delete(i);
          if (!tile.tree && !tile.crop && !tile.b && !tile.road && !tile.flag) {
            tile.tree = 0.05;
            tile.conifer = Math.random() < 0.4;
          }
        } },
        { k: 'walk', x: home.x, y: home.y },
        { k: 'do', f: () => { s.onAbort = null; s.inside = true; } },
        { k: 'work', t: 4 },
      ];
      return;
    }
    case 'fisher': {
      if (home.out.fish >= PILE) return rest(2, 'Full, waiting for a carrier');
      const at = findTile(g, home, r, (t, x, y) => t.t !== 'water' && g.passable(x, y) && near(g, x, y, 1, (n) => n.t === 'water'));
      if (!at) return rest(3, 'No shore in range');
      home.status = 'Fishing';
      const i = claim(g, s, at);
      s.tasks = [
        { k: 'walk', ...at },
        { k: 'work', t: 6, anim: 'fish' },
        { k: 'do', f: () => { g.claimed.delete(i); s.carrying = 'fish'; } },
        { k: 'walk', x: home.x, y: home.y },
        { k: 'do', f: () => { s.carrying = null; s.onAbort = null; s.inside = true; make('fish'); } },
        { k: 'work', t: 2 },
      ];
      return;
    }
    case 'farmer': {
      // Harvest ripe grain first, then sow the bare fields. A farmer only uses its own farm's fields.
      const ripe = home.out.grain < PILE ? findTile(g, home, r, (t) => t.field === home.id && t.crop >= 1) : null;
      const at = ripe ?? findTile(g, home, r, (t) => t.field === home.id && !t.crop, true);
      if (!at) return rest(3, home.out.grain >= PILE ? 'Full, waiting for a carrier' : 'Waiting for the grain to ripen');
      home.status = ripe ? 'Harvesting grain' : 'Sowing grain';
      const i = claim(g, s, at);
      const tile = g.world.at(at.x, at.y);
      s.tasks = [
        { k: 'walk', ...at },
        { k: 'work', t: ripe ? 3 : 2.5, anim: ripe ? 'reap' : 'plant' },
        { k: 'do', f: () => {
          g.claimed.delete(i);
          if (ripe && tile.crop >= 1) {
            tile.crop = 0;
            s.carrying = 'grain';
          } else if (!ripe && !tile.crop && tile.field === home.id) tile.crop = 0.02;
        } },
        { k: 'walk', x: home.x, y: home.y },
        { k: 'do', f: () => {
          if (s.carrying) make('grain');
          s.carrying = null;
          s.onAbort = null;
          s.inside = true;
        } },
        { k: 'work', t: 1.5 },
      ];
      return;
    }
    case 'sawyer':
    case 'miller':
    case 'baker':
    case 'miner': {
      const rc = RECIPES[home.type]!;
      if (home.out[rc.to] >= PILE) return rest(2, 'Full, waiting for a carrier');
      const input = rc.from.find((k) => home.stock[k] > 0);
      if (!input) return rest(1, rc.waiting);
      if (rc.with && !home.stock[rc.with]) return rest(1, rc.lacking!);
      home.status = rc.doing;
      s.tasks = [
        { k: 'do', f: () => {
          home.stock[input]--;
          if (rc.with) home.stock[rc.with]--;
          home.busy = true;
          home.using = input;
        } },
        { k: 'work', t: rc.t },
        { k: 'do', f: () => { make(rc.to, rc.n); home.busy = false; home.using = null; } },
      ];
      return;
    }
    case 'drawer': {
      if (home.out.water >= PILE) return rest(2, 'Full, waiting for a carrier');
      home.status = 'Drawing water';
      s.tasks = [
        { k: 'do', f: () => { home.busy = true; } },
        { k: 'work', t: WELL_DRAW },
        { k: 'do', f: () => { make('water'); home.busy = false; } },
      ];
      return;
    }
    case 'scout':
      return rest(5, 'Keeping watch over your land');
  }
}

// Mark a tile as taken, so no other worker heads there. If the walk fails, skip the tile for a while.
function claim(g: Game, s: Settler, at: P) {
  const i = at.y * W + at.x;
  g.claimed.add(i);
  s.onAbort = () => {
    g.claimed.delete(i);
    g.snubbed.set(i, g.time + 30); // couldn't get there; try elsewhere for a while
    s.carrying = null;
  };
  return i;
}

function findTile(g: Game, b: Building, r: number, ok: (t: Tile, x: number, y: number) => boolean, random = false): P | null {
  let best: P | null = null, bd = Infinity;
  const cands: P[] = [];
  for (let y = b.y - r; y <= b.y + r; y++) {
    for (let x = b.x - r; x <= b.x + r; x++) {
      if (!g.world.inside(x, y)) continue;
      const d = Math.hypot(x - b.x, y - b.y);
      const i = y * W + x;
      if (d > r || g.claimed.has(i) || (g.snubbed.get(i) ?? 0) > g.time) continue;
      if (!ok(g.world.at(x, y), x, y)) continue;
      if (random) cands.push({ x, y });
      else if (d < bd) { bd = d; best = { x, y }; }
    }
  }
  return random ? cands[Math.floor(Math.random() * cands.length)] ?? null : best;
}
