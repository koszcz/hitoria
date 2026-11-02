// Island themes: on new maps the second and far island get two different themes, pine highlands
// and wild meadows, so they look and play differently. Older maps have no themes.
import { describe, expect, test } from 'bun:test';
import { Game } from '../game';
import { World, W, H } from '../world';
import { drawThemes } from './themes';
import type { IsleName } from './themes';

const SEEDS = [1, 2, 3, 7, 42, 99, 12345, 987654321];

// Every tile of one island, as { x, y, i }, where i is the tile's index.
function tilesOf(w: World, isle: IsleName) {
  const out: { x: number; y: number; i: number }[] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (w.isleAt(x, y) === isle) out.push({ x, y, i: y * W + x });
  return out;
}
const pinesOf = (w: World): IsleName => (w.themes!.other === 'pines' ? 'other' : 'far');
const meadowOf = (w: World): IsleName => (w.themes!.other === 'meadow' ? 'other' : 'far');
const lightOf = (col: string) => Number(/, ([\d.]+)%\)$/.exec(col)![1]);

describe('island themes', () => {
  test('both themes come up across seeds, on either island', () => {
    const seen = new Set(SEEDS.map((s) => drawThemes(s).other));
    expect([...seen].sort()).toEqual(['meadow', 'pines']);
  });

  test('older maps have no themes and no cliffs', () => {
    for (const map of [6, 7]) {
      const w = new World(1, map);
      expect(w.themes).toBeNull();
      expect(w.cliff.every((c) => c === 0)).toBe(true);
      expect(w.themeAt(Math.round(w.isle!.x), Math.round(w.isle!.y))).toBeNull();
    }
  });

  for (const seed of SEEDS)
    describe(`seed ${seed}`, () => {
      const w = new World(seed);
      const pines = tilesOf(w, pinesOf(w)), meadow = tilesOf(w, meadowOf(w));
      const trees = (ts: typeof pines) => ts.filter((t) => w.tiles[t.i].tree).length;

      test('gives the two islands two different themes', () => {
        expect(w.themes).toEqual(drawThemes(seed));
        expect(w.themes!.other).not.toBe(w.themes!.far);
      });

      test('the home island has no theme', () => {
        expect(w.themeAt(w.start.x, w.start.y)).toBeNull();
      });

      test('the pine island has dense pines, at least twice the trees of the meadow island', () => {
        const pineTrees = pines.filter((t) => w.tiles[t.i].tree);
        expect(pineTrees.length).toBeGreaterThanOrEqual(40);
        expect(pineTrees.length).toBeGreaterThanOrEqual(2 * trees(meadow));
        const conifers = pineTrees.filter((t) => w.tiles[t.i].conifer).length;
        expect(conifers / pineTrees.length).toBeGreaterThanOrEqual(0.85);
      });

      test('the pine island has sea cliffs of bare rock on its far shore, with no ore', () => {
        const shape = pinesOf(w) === 'far' ? w.far! : { ...w.isle!, out: isleOut(w) };
        const cliffs = pines.filter((t) => w.cliff[t.i]);
        expect(cliffs.length).toBeGreaterThanOrEqual(12);
        for (const c of cliffs) {
          expect(w.tiles[c.i].t).toBe('mountain');
          expect(w.hasOre(c.x, c.y)).toBe(false);
          expect((c.x - shape.x) * shape.out.x + (c.y - shape.y) * shape.out.y).toBeGreaterThan(0);
        }
        const bySea = cliffs.filter((c) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => w.at(c.x + dx, c.y + dy).t === 'water'));
        expect(bySea.length).toBeGreaterThanOrEqual(6);
        expect(meadow.some((t) => w.cliff[t.i])).toBe(false);
      });

      test('the meadow island has few trees but keeps a grove, and wide flower meadows', () => {
        expect(trees(meadow)).toBeGreaterThanOrEqual(3);
        expect(trees(meadow)).toBeLessThanOrEqual(15);
        const open = meadow.filter((t) => w.tiles[t.i].t === 'grass' && !w.tiles[t.i].tree);
        const flowers = open.filter((t) => w.tiles[t.i].plant === 'flowers').length;
        expect(flowers / open.length).toBeGreaterThanOrEqual(0.4);
      });

      test('both islands keep their ore ridge', () => {
        for (const ts of [pines, meadow]) expect(ts.filter((t) => w.hasOre(t.x, t.y)).length).toBeGreaterThanOrEqual(6);
      });

      test('pine ground is darker than meadow ground', () => {
        const avg = (ts: typeof pines) => {
          const g = ts.filter((t) => w.tiles[t.i].t === 'grass');
          return g.reduce((s, t) => s + lightOf(w.tiles[t.i].col), 0) / g.length;
        };
        expect(avg(pines)).toBeLessThan(avg(meadow) - 8);
      });

      test('more deer and hares live on the meadow island than on the pine island', () => {
        const g = new Game(seed);
        const count = (isle: IsleName) =>
          [...g.animals.values()].filter((a) => a.kind !== 'fox' && g.world.isleAt(a.x, a.y) === isle).length;
        expect(count(meadowOf(w))).toBeGreaterThanOrEqual(6);
        expect(count(meadowOf(w))).toBeGreaterThan(count(pinesOf(w)));
      });
    });

  test('an old map gets no meadow animals, so it has fewer', () => {
    const g7 = new Game(1, 7), g8 = new Game(1);
    expect(g8.animals.size - g7.animals.size).toBeGreaterThanOrEqual(6);
  });
});

// The second island faces out along the bay, which runs from the start through its centre.
function isleOut(w: World) {
  const dx = w.isle!.x - w.start.x, dy = w.isle!.y - w.start.y, d = Math.hypot(dx, dy);
  return { x: dx / d, y: dy / d };
}
