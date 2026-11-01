// The island as text, for a play tester who cannot look at the screen: a map of the land around a
// point, and the places where a building could go, with what lies around each one.
import { BDEFS, type BType, type Game } from '../game';
import { H, W } from '../world';

export const LEGEND = 'H HQ · B building · # farm field · T tree · t sapling · o boulder · ^ mountain · ~ water · : sand · . grass · - outside your land';

// One character per tile. Columns and rows are numbered, so the tester can read coordinates.
export function mapText(g: Game, cx: number, cy: number, r = 10): string {
  const xs: number[] = [];
  for (let x = cx - r; x <= cx + r; x++) if (x >= 0 && x < W) xs.push(x);
  const head = (digit: (x: number) => string) => '    ' + xs.map(digit).join('');
  const lines = [head((x) => String(Math.floor(x / 10) % 10)), head((x) => String(x % 10))];
  for (let y = cy - r; y <= cy + r; y++) {
    if (!g.world.inside(cx, y)) continue;
    lines.push(String(y).padStart(3) + ' ' + xs.map((x) => tileChar(g, x, y)).join(''));
  }
  return [...lines, LEGEND].join('\n');
}

function tileChar(g: Game, x: number, y: number) {
  const t = g.world.at(x, y);
  if (t.b) return g.buildings.get(t.b)?.type === 'hq' ? 'H' : 'B';
  if (t.t === 'water') return '~';
  if (t.t === 'mountain') return '^';
  if (!g.world.territory[y * W + x]) return '-';
  if (t.field) return '#';
  if (t.tree >= 1) return 'T';
  if (t.tree > 0) return 't';
  if (t.rock > 0) return 'o';
  return t.t === 'sand' ? ':' : '.';
}

// What a player would see around a tile at a glance, within a building's working radius.
export function around(g: Game, x: number, y: number, r: number): string {
  let trees = 0, young = 0, rocks = 0, water = 0, mountain = 0, ripe = 0;
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++) {
      if (Math.hypot(dx, dy) > r || !g.world.inside(x + dx, y + dy)) continue;
      const t = g.world.at(x + dx, y + dy);
      if (t.tree >= 1) trees++;
      else if (t.tree > 0) young++;
      if (t.rock > 0) rocks++;
      if (t.t === 'water') water++;
      if (t.t === 'mountain') mountain++;
      if (t.crop >= 1) ripe++;
    }
  return `trees ${trees} (+${young} young), boulders ${rocks}, water ${water}, mountain ${mountain}, ripe grain ${ripe}`;
}

export interface Spot {
  x: number;
  y: number;
  dist: number; // tiles from the point the tester asked about
  around: string;
}

// The free places for a building, nearest to (nx, ny) first.
export function spots(g: Game, type: BType, n = 5, nx = g.hq.x, ny = g.hq.y): Spot[] {
  const found: Spot[] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!g.world.inside(x, y) || !g.world.territory[y * W + x]) continue;
      found.push({ x, y, dist: Math.round(Math.hypot(x - nx, y - ny)), around: '' });
    }
  found.sort((a, b) => a.dist - b.dist);
  const ok: Spot[] = [];
  for (const s of found) {
    if (ok.length >= n) break;
    if (g.canPlace(type, s.x, s.y)) continue;
    ok.push({ ...s, around: around(g, s.x, s.y, Math.max(1, BDEFS[type].radius)) });
  }
  return ok;
}
