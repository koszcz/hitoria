// Mountains never hide good land: from map version 14, each island's mountains sit at the top of
// the screen, with the sea behind them, and any ground a peak still hides from the camera is bare
// rock. Older maps keep their land.
import { describe, expect, test } from 'bun:test';
import { World, MAP_VERSION } from '../world';
import { Relief, cornerHeights } from '../render/relief';
import { HIDE_FROM, hiddenTiles } from './hidden';
import { RIGHT, TOP_RIDGES_FROM, UP } from './isle';
import type { IsleName } from './themes';

const SEEDS = [1, 2, 3, 7, 42, 99, 12345, 987654321];
const BEFORE = HIDE_FROM - 1;
// The crest of an island's ridge stands at least this high.
const CREST = 0.9;

// A short hash of the land, to check that an older map version keeps building the same map.
// Numbers are rounded first, as in world.test.ts.
const round = (n: number) => Number(n.toPrecision(12));
const fingerprint = (o: unknown) =>
  Bun.hash(JSON.stringify(o, (_, v) => (typeof v === 'number' ? round(v) : typeof v === 'string' ? v.replace(/\d+\.\d+/g, (n) => String(round(+n))) : v))).toString();

// The way the camera looks, from the bottom right of the map down to the top left, 30° down.
const LOOK = { x: -Math.cos(Math.PI / 6) / Math.SQRT2, y: -Math.sin(Math.PI / 6), z: -Math.cos(Math.PI / 6) / Math.SQRT2 };

// The ground as the renderer draws it.
const reliefOf = (w: World) =>
  new Relief(cornerHeights(w.w, w.h, (x, y) => w.at(x, y).h), w.w, w.h, { home: { x: w.start.x + 0.5, y: w.start.y + 0.5 } });

// How far in front of the middle of tile (x, y) the camera's line of sight to it first meets the
// ground, in tiles across the map. Below 0, the line of sight grazed the tile and met the ground
// behind it.
function missBy(r: Relief, x: number, y: number) {
  const cx = x + 0.5, cz = y + 0.5, far = 60;
  const o = { x: cx - LOOK.x * far, y: r.at(cx, cz) - LOOK.y * far, z: cz - LOOK.z * far };
  const hit = r.hit(o, LOOK)!;
  return (hit.x - cx + hit.z - cz) * Math.SQRT1_2;
}

const walkable = (w: World, i: number) => w.tiles[i].t === 'grass' || w.tiles[i].t === 'sand';
const isleOf = (w: World, i: number) => w.isleAt(i % w.w, Math.floor(i / w.w));
// How far up the screen tile i lies from point c.
const upFrom = (w: World, i: number, c: { x: number; y: number }) => ((i % w.w) - c.x) * UP.x + (Math.floor(i / w.w) - c.y) * UP.y;

describe('mountains never hide good land, by map version', () => {
  test('new maps use map version 14', () => {
    expect(MAP_VERSION).toBe(14);
    expect(HIDE_FROM).toBe(14);
    expect(TOP_RIDGES_FROM).toBe(14);
  });

  test('map version 13 still builds the same land and ore', () => {
    const w1 = new World(1, BEFORE), w2 = new World(12345, BEFORE);
    expect(fingerprint(w1.tiles)).toBe('10591184884088190241');
    expect(fingerprint(w2.tiles)).toBe('11898212368960248875');
    expect(Bun.hash(w1.ore.join('')).toString()).toBe('5086561614281546504');
    expect(Bun.hash(w2.ore.join('')).toString()).toBe('4594390708720394490');
  });

  test('older maps have no bare rock, and peaks still hide some grass there', () => {
    const w = new World(1, BEFORE), hidden = hiddenTiles(w);
    expect(w.bare.every((b) => b === 0)).toBe(true);
    expect(w.tiles.filter((_, i) => hidden[i] && w.tiles[i].t === 'grass').length).toBeGreaterThan(100);
  });
});

describe('finding the ground a peak hides', () => {
  // An older map has plenty of hidden grass to check against.
  const w = new World(7, BEFORE), r = reliefOf(w), hidden = hiddenTiles(w);
  const land = w.tiles.map((_, i) => i).filter((i) => w.tiles[i].t !== 'water');

  test('matches where the camera\'s line of sight first meets the drawn ground', () => {
    let wrong = 0, sure = 0;
    for (const i of land) {
      const miss = missBy(r, i % w.w, Math.floor(i / w.w));
      // The ray walks in small steps, so a line of sight that only grazes a crest can go either way.
      if (Math.abs(miss) > 0.02 && miss < 0.3) continue;
      sure++;
      if ((miss >= 0.3) !== (hidden[i] === 1)) wrong++;
    }
    expect(sure).toBeGreaterThan(0.95 * land.length);
    expect(wrong).toBeLessThanOrEqual(0.002 * sure);
  });

  test('flat ground hides nothing', () => {
    const flat = new World(1, BEFORE);
    for (const t of flat.tiles) t.h = 0.5;
    expect(hiddenTiles(flat).every((h) => h === 0)).toBe(true);
  });
});

describe('mountains never hide good land', () => {
  for (const seed of SEEDS)
    describe(`seed ${seed}`, () => {
      const w = new World(seed), hidden = hiddenTiles(w);
      const all = w.tiles.map((_, i) => i);

      test('no grass or sand hides behind a peak', () => {
        expect(all.filter((i) => hidden[i] && walkable(w, i))).toEqual([]);
      });

      test('hidden ground is bare rock, with no trees or boulders', () => {
        const bare = all.filter((i) => w.bare[i]);
        expect(bare.length).toBeGreaterThan(0);
        for (const i of bare) {
          expect(w.tiles[i].t).toBe('mountain');
          expect(w.tiles[i].tree).toBe(0);
          expect(w.tiles[i].rock).toBe(0);
        }
      });

      test('bare rock holds ore on the outer islands only, like their mountains', () => {
        for (const i of all.filter((i) => w.bare[i])) expect(w.ore[i]).toBe(w.isleAt(i % w.w, Math.floor(i / w.w), 0) ? 1 : 0);
      });

      for (const isle of ['other', 'far'] as IsleName[])
        test(`the ${isle === 'other' ? 'second' : 'far'} island's ridge sits at the top of the screen, with the sea behind it`, () => {
          const c = isle === 'other' ? w.isle! : w.far!;
          const ridge = all.filter((i) => isleOf(w, i) === isle && w.ore[i] && !w.bare[i]);
          expect(ridge.length).toBeGreaterThanOrEqual(60);
          // Every bit of the ridge lies up the screen from the island's centre.
          for (const i of ridge) expect(upFrom(w, i, c)).toBeGreaterThan(2);
          // Up the screen from the crest of the ridge's middle, only mountain lies between it and
          // the sea. A cove's lagoon may cut the ridge down, so lower parts of it don't count.
          const right = (i: number) => ((i % w.w) - c.x) * RIGHT.x + (Math.floor(i / w.w) - c.y) * RIGHT.y;
          const crest = ridge.filter((i) => Math.abs(right(i)) <= w.shape.ridge / 2 && w.tiles[i].h >= CREST);
          expect(crest.length).toBeGreaterThanOrEqual(4);
          for (const i of crest) {
            let j = i;
            while (w.tiles[j].t !== 'water') {
              expect(w.tiles[j].t).toBe('mountain');
              j -= w.w + 1;
            }
          }
        });

      test('the home mountain sits up the screen from the start', () => {
        const near = all.filter((i) => Math.hypot((i % w.w) - w.start.x, Math.floor(i / w.w) - w.start.y) < 10);
        const top = near.reduce((a, b) => (w.tiles[b].h > w.tiles[a].h ? b : a));
        expect(w.tiles[top].t).toBe('mountain');
        expect(upFrom(w, top, w.start)).toBeGreaterThan(3);
      });
    });
});
