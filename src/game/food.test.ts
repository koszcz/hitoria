import { describe, expect, test } from 'bun:test';
import { Game, Good } from '.';
import { flatGame, run, runUntil, expectIncomingConsistent, placeBare } from './test-helpers';

function placeLinked(g: Game, type: Parameters<Game['place']>[0], x: number, y: number) {
  expect(g.canPlace(type, x, y)).toBeNull();
  const b = placeBare(g, type, x, y);
  const r = g.buildRoad(b.flag, g.flags.get(g.hq.flag)!);
  if (typeof r === 'string') throw new Error(r);
  return b;
}

function setTiles(g: Game, x0: number, y0: number, x1: number, y1: number, t: 'grass' | 'water' | 'mountain') {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g.world.at(x, y).t = t;
}

describe('mines and food', () => {
  test('mines and fishers only go where they can work', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    expect(g.canPlace('mine', x + 5, y)).toBe('Must be next to a mountain');
    expect(g.canPlace('fisher', x + 5, y)).toBe('Must be near water');
    setTiles(g, x + 7, y - 1, x + 8, y + 1, 'mountain');
    expect(g.canPlace('mine', x + 5, y)).toBeNull();
    setTiles(g, x - 9, y - 1, x - 8, y + 1, 'water');
    expect(g.canPlace('fisher', x - 5, y)).toBeNull();
  });

  test('a fisher brings fish home from the shore', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    setTiles(g, x - 9, y - 2, x - 8, y + 2, 'water');
    placeLinked(g, 'fisher', x - 5, y);
    runUntil(g, () => g.stored.fish >= 2, 300, () => expectIncomingConsistent(g));
  });

  test('a farm sows grain, harvests it, and a mill and bakery turn it into bread', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    const farm = placeLinked(g, 'farm', x + 5, y - 4);
    placeLinked(g, 'mill', x - 4, y);
    placeLinked(g, 'bakery', x + 4, y + 3);
    runUntil(g, () => farm.built, 120);
    runUntil(g, () => g.world.tiles.some((t) => t.crop > 0), 60);
    runUntil(g, () => g.stored.bread >= 1, 600, () => expectIncomingConsistent(g));
  });

  test('a mine eats food and makes stone without running out', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    setTiles(g, x + 7, y - 1, x + 8, y + 1, 'mountain');
    const mine = placeLinked(g, 'mine', x + 5, y);
    runUntil(g, () => mine.built, 120);
    const stone = g.stored.stone;
    // No food, no stone.
    runUntil(g, () => mine.status === 'Waiting for fish or bread', 30);
    g.hq.stock.fish = 3;
    runUntil(g, () => g.stored.stone >= stone + 6, 300, () => expectIncomingConsistent(g));
    expect(g.stored.fish + mine.stock.fish).toBe(0);
  });

  test('a version 1 save without food goods still loads', () => {
    const g = flatGame();
    const d = g.save();
    d.v = 1;
    for (const b of d.buildings) b.stock = { log: b.stock.log, plank: b.stock.plank, stone: b.stock.stone } as typeof b.stock;
    d.tiles = d.tiles.map((t) => t.slice(0, 6) as typeof t);
    const l = Game.load(d);
    expect(l.hq.stock.bread).toBe(0);
    expect(l.world.tiles.every((t) => t.crop === 0)).toBe(true);
  });
  test('a fisher with no shore in range says so', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    setTiles(g, x - 9, y - 2, x - 8, y + 2, 'water');
    const fisher = placeLinked(g, 'fisher', x - 5, y);
    setTiles(g, x - 9, y - 2, x - 8, y + 2, 'grass');
    runUntil(g, () => fisher.status === 'No shore in range', 150);
    run(g, 20);
    expect(g.stored.fish).toBe(0);
  });

  test('sown grain ripens in about 60 seconds', () => {
    const g = flatGame();
    const tile = g.world.at(g.hq.x + 6, g.hq.y - 6);
    tile.crop = 0.02;
    run(g, 55);
    expect(tile.crop).toBeGreaterThan(0.9);
    expect(tile.crop).toBeLessThan(1);
    run(g, 6);
    expect(tile.crop).toBe(1);
  });

  test('buildings, flags and roads clear the grain they are built on', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    for (let ty = y - 8; ty <= y + 8; ty++)
      for (let tx = x - 8; tx <= x + 8; tx++) {
        const t = g.world.at(tx, ty);
        if (!t.b && !t.flag) t.crop = 0.5;
      }
    const b = placeLinked(g, 'mill', x + 6, y);
    const f = g.startFlag({ x: x - 6, y: y - 6 });
    if (typeof f === 'string') throw new Error(f);
    expect(g.world.at(b.x, b.y).crop).toBe(0);
    expect(g.world.at(b.x, b.y + 1).crop).toBe(0);
    expect(g.world.at(f.x, f.y).crop).toBe(0);
    expect(g.roads.size).toBeGreaterThan(0);
    for (const r of g.roads.values()) for (const p of r.path) expect(g.world.at(p.x, p.y).crop).toBe(0);
  });

  test('a mine keeps at most 4 food, counting fish and bread together', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    setTiles(g, x + 7, y - 1, x + 8, y + 1, 'mountain');
    const mine = placeLinked(g, 'mine', x + 5, y);
    runUntil(g, () => mine.built, 120);
    Object.assign(g.hq.stock, { fish: 10, bread: 10 });
    const stone = g.stored.stone;
    let most = 0;
    runUntil(g, () => g.stored.stone >= stone + 8, 300, () => {
      const food = mine.stock.fish + mine.stock.bread + mine.incoming.fish + mine.incoming.bread;
      expect(food).toBeLessThanOrEqual(4);
      most = Math.max(most, food);
    });
    expect(most).toBe(4);
  });

  test('saving while a workshop works puts its input back', () => {
    const g = flatGame();
    const mill = placeLinked(g, 'mill', g.hq.x - 4, g.hq.y);
    runUntil(g, () => mill.built, 150);
    mill.stock.grain = 1;
    runUntil(g, () => mill.busy, 30);
    expect(mill.using).toBe('grain');
    const d = g.save();
    const saved = d.buildings.find((b) => b.id === mill.id)!;
    expect(saved.stock.grain).toBe(1);
    expect(saved.busy).toBe(false);
    expect(saved.using).toBeNull();
    const l = Game.load(JSON.parse(JSON.stringify(d)));
    runUntil(l, () => l.stored.flour >= 1, 120);
  });

  test('a version 1 save drops goods this version does not know', () => {
    const g = flatGame();
    const d = g.save();
    d.v = 1;
    d.flags.find((f) => f.id === g.hq.flag)!.items.push({ g: 'cheese' as Good, dest: 0 }, { g: 'log', dest: 0 });
    const l = Game.load(d);
    expect(l.flags.get(g.hq.flag)!.items.map((it) => it.g)).toEqual(['log']);
  });
});
