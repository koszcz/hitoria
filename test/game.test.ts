import { describe, expect, test } from 'bun:test';
import { Game, BDEFS, SAVE_VERSION, bag } from '../src/game';
import { W } from '../src/world';
import { flatGame, run, runUntil, totalGoods, expectIncomingConsistent } from './helpers';

// Place a building and join its flag to the HQ's flag with a road.
function placeLinked(g: Game, type: Parameters<Game['place']>[0], x: number, y: number) {
  expect(g.canPlace(type, x, y)).toBeNull();
  const b = g.place(type, x, y);
  const r = g.buildRoad(b.flag, g.flags.get(g.hq.flag)!);
  if (typeof r === 'string') throw new Error(r);
  expect(g.linked(b)).toBe(true);
  return b;
}

const inside = (g: Game, x: number, y: number) => !!g.world.territory[y * W + x];

describe('a new game', () => {
  test('starts with a built HQ, its flag in front, and starting goods', () => {
    const g = new Game(1);
    expect(g.hq.built).toBe(true);
    const f = g.flags.get(g.hq.flag)!;
    expect(f).toMatchObject({ x: g.hq.x, y: g.hq.y + 1, building: g.hq.id });
    expect(g.hq.stock).toEqual(bag({ log: 6, plank: 24, stone: 14 }));
    expect(g.population).toBe(18);
    expect(g.settlers.size).toBe(0);
  });

  test('owns the land within the HQ radius only', () => {
    const g = new Game(1);
    const r = BDEFS.hq.radius;
    expect(inside(g, g.hq.x + r, g.hq.y)).toBe(true);
    expect(inside(g, g.hq.x + r + 1, g.hq.y)).toBe(false);
  });
});

describe('canPlace', () => {
  test('allows free grass inside your land', () => {
    const g = flatGame();
    expect(g.canPlace('woodcutter', g.hq.x + 4, g.hq.y)).toBeNull();
  });

  test('explains why a spot is not allowed', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    expect(g.canPlace('woodcutter', 10, W - 1)).toBe('Outside the map');
    expect(g.canPlace('woodcutter', x, y)).toBe('Occupied');
    expect(g.canPlace('woodcutter', x + 12, y)).toBe('Outside your land');

    g.world.at(x + 4, y).t = 'sand';
    expect(g.canPlace('woodcutter', x + 4, y)).toBe('Needs flat grass');
    g.world.at(x - 4, y).tree = 1;
    expect(g.canPlace('woodcutter', x - 4, y)).toBe('A tree is in the way');
    g.world.at(x, y - 4).rock = 3;
    expect(g.canPlace('woodcutter', x, y - 4)).toBe('A boulder is in the way');
  });

  test('needs room for a flag in front of the door', () => {
    const g = flatGame();
    // The tile in front would be the HQ itself.
    expect(g.canPlace('woodcutter', g.hq.x, g.hq.y - 1)).toBe('No room for its flag in front');
    // The tile in front would sit right next to the HQ's flag.
    expect(g.canPlace('woodcutter', g.hq.x + 1, g.hq.y)).toBe('No room for its flag in front');
  });

  test('refuses spots settlers cannot walk to', () => {
    const g = flatGame();
    const bx = g.hq.x + 5, by = g.hq.y - 4;
    for (let dy = -2; dy <= 3; dy++)
      for (let dx = -2; dx <= 2; dx++)
        if (Math.abs(dx) === 2 || dy === -2 || dy === 3) g.world.at(bx + dx, by + dy).t = 'water';
    expect(g.canPlace('woodcutter', bx, by)).toBe('No road can reach it');
  });

  // Ring the flag tile in front of (bx, by) with trees of the given size, leaving the building's own tile free.
  const wallFlag = (g: ReturnType<typeof flatGame>, bx: number, by: number, tree: number) => {
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++)
        if ((dx || dy) && (dx || dy !== -1)) g.world.at(bx + dx, by + 1 + dy).tree = tree;
  };

  test('refuses a spot whose flag is walled in by trees', () => {
    const g = flatGame();
    const bx = g.hq.x + 5, by = g.hq.y - 4;
    wallFlag(g, bx, by, 1);
    expect(g.canPlace('woodcutter', bx, by)).toBe('No road can reach it');
  });

  test('saplings around the flag also block roads', () => {
    const g = flatGame();
    const bx = g.hq.x + 5, by = g.hq.y - 4;
    wallFlag(g, bx, by, 0.1);
    expect(g.canPlace('woodcutter', bx, by)).toBe('No road can reach it');
  });

  test('a road may reach the flag through a gap in the trees', () => {
    const g = flatGame();
    const bx = g.hq.x + 5, by = g.hq.y - 4;
    wallFlag(g, bx, by, 1);
    g.world.at(bx, by + 2).tree = 0;
    expect(g.canPlace('woodcutter', bx, by)).toBeNull();
    const b = g.place('woodcutter', bx, by);
    expect(typeof g.buildRoad(b.flag, g.flags.get(g.hq.flag)!)).toBe('object');
    expect(g.linked(b)).toBe(true);
  });
});

describe('roads and flags', () => {
  test('a road links a building to the HQ', () => {
    const g = flatGame();
    const b = g.place('woodcutter', g.hq.x + 4, g.hq.y);
    expect(g.linked(b)).toBe(false);
    g.buildRoad(b.flag, g.flags.get(g.hq.flag)!);
    expect(g.linked(b)).toBe(true);
    expect(g.roads.size).toBe(1);
    const r = [...g.roads.values()][0];
    // The road's inner tiles are marked; its end tiles are the two flags.
    for (const p of r.path.slice(1, -1)) expect(g.world.at(p.x, p.y).road).toBe(r.id);
    expect(g.flags.get(b.flag)!.roads).toEqual([r.id]);
    expect(g.flags.get(g.hq.flag)!.roads).toEqual([r.id]);
  });

  test('long roads get extra flags so several carriers share them', () => {
    const g = flatGame();
    const end = g.buildRoad(g.hq.flag, { x: g.hq.x + 9, y: g.hq.y + 1 });
    expect(typeof end).not.toBe('string');
    expect(g.roads.size).toBeGreaterThan(1);
    for (const r of g.roads.values()) expect(r.path.length - 1).toBeLessThanOrEqual(5);
  });

  test('starting a road on an existing road splits it with a new flag', () => {
    const g = flatGame();
    const b = g.place('woodcutter', g.hq.x + 4, g.hq.y);
    g.buildRoad(b.flag, g.flags.get(g.hq.flag)!);
    expect(g.roads.size).toBe(1);
    const mid = { x: g.hq.x + 2, y: g.hq.y + 1 };
    const f = g.startFlag(mid);
    expect(typeof f).not.toBe('string');
    expect(g.roads.size).toBe(2);
    expect(g.world.at(mid.x, mid.y).flag).toBeGreaterThan(0);
    expect(g.linked(b)).toBe(true);
  });

  test('refuses roads that go nowhere or end beside another flag', () => {
    const g = flatGame();
    const hf = g.flags.get(g.hq.flag)!;
    expect(g.planRoad(hf.id, hf)).toBeNull();
    g.buildRoad(hf.id, { x: hf.x + 6, y: hf.y });
    expect(g.planRoad(hf.id, { x: hf.x + 7, y: hf.y + 1 })).toBeNull();
    expect(g.buildRoad(hf.id, { x: hf.x + 7, y: hf.y + 1 })).toBe('No room for a road there');
  });

  test('removing a road unlinks the building', () => {
    const g = flatGame();
    const b = placeLinked(g, 'woodcutter', g.hq.x + 4, g.hq.y);
    const r = [...g.roads.values()][0];
    const p = r.path[1];
    expect(g.removeAt(p)).toBeNull();
    expect(g.roads.size).toBe(0);
    for (const q of r.path) expect(g.world.at(q.x, q.y).road).toBe(0);
    expect(g.linked(b)).toBe(false);
  });

  test('removing a flag removes its roads too', () => {
    const g = flatGame();
    const end = g.buildRoad(g.hq.flag, { x: g.hq.x + 4, y: g.hq.y + 1 });
    if (typeof end === 'string') throw new Error(end);
    expect(g.removeAt(end)).toBeNull();
    expect(g.flags.has(end.id)).toBe(false);
    expect(g.roads.size).toBe(0);
    expect(g.flags.get(g.hq.flag)!.roads).toEqual([]);
  });

  test("won't remove buildings or a building's flag", () => {
    const g = flatGame();
    expect(g.removeAt(g.hq)).toBe('Demolishing buildings is not in yet');
    expect(g.removeAt(g.flags.get(g.hq.flag)!)).toBe("A building's own flag can't be removed");
    expect(g.removeAt({ x: g.hq.x + 3, y: g.hq.y - 3 })).toBe('Nothing to remove here');
  });
});

describe('construction', () => {
  test('a linked site gets its materials and is built', () => {
    const g = flatGame();
    const b = placeLinked(g, 'woodcutter', g.hq.x + 4, g.hq.y);
    runUntil(g, () => b.built, 120);
    expect(b.status).not.toBe('Under construction');
    expect(g.hq.stock.plank).toBe(24 - BDEFS.woodcutter.cost.plank!);
  });

  test('a site with no road is never supplied', () => {
    const g = flatGame();
    const b = g.place('woodcutter', g.hq.x + 4, g.hq.y);
    run(g, 60);
    expect(b.built).toBe(false);
    expect(b.stock).toEqual(bag({ log: 0, plank: 0, stone: 0 }));
    expect(b.status).toBe('Needs a road to your HQ');
  });

  test('no goods or settlers appear or vanish while building', () => {
    const g = flatGame();
    const before = totalGoods(g);
    const b = placeLinked(g, 'lookout', g.hq.x + 8, g.hq.y - 2);
    runUntil(g, () => b.built, 300, () => {
      if (b.built) return; // the last step used up the materials
      expect(totalGoods(g)).toEqual(before);
      expect(g.population).toBe(18);
      expectIncomingConsistent(g);
    });
    const cost = BDEFS.lookout.cost;
    expect(totalGoods(g)).toEqual({ ...before, plank: before.plank - cost.plank!, stone: before.stone - cost.stone! });
  });

  test('a finished lookout expands your land', () => {
    const g = flatGame();
    const b = placeLinked(g, 'lookout', g.hq.x + 8, g.hq.y);
    const beyond = { x: b.x + BDEFS.lookout.radius, y: b.y };
    expect(inside(g, beyond.x, beyond.y)).toBe(false);
    runUntil(g, () => b.built, 300);
    expect(inside(g, beyond.x, beyond.y)).toBe(true);
  });

  test('builders go home when done', () => {
    const g = flatGame();
    const b = placeLinked(g, 'woodcutter', g.hq.x + 4, g.hq.y);
    runUntil(g, () => b.built, 120);
    runUntil(g, () => ![...g.settlers.values()].some((s) => s.role === 'builder'), 60);
  });
});

describe('production', () => {
  test('a woodcutter fells trees and sends logs to the HQ', () => {
    const g = flatGame();
    const b = placeLinked(g, 'woodcutter', g.hq.x + 4, g.hq.y);
    const trees = [{ x: b.x + 2, y: b.y - 2 }, { x: b.x + 3, y: b.y - 1 }];
    for (const t of trees) g.world.at(t.x, t.y).tree = 1;
    runUntil(g, () => g.hq.stock.log >= 8, 300);
    for (const t of trees) expect(g.world.at(t.x, t.y).tree).toBe(0);
  });

  test('a woodcutter waits when no grown trees are in range', () => {
    const g = flatGame();
    const b = placeLinked(g, 'woodcutter', g.hq.x + 4, g.hq.y);
    g.world.at(b.x + 2, b.y - 2).tree = 0.5; // a sapling, not ready
    runUntil(g, () => b.status === 'No grown trees in range', 200);
    expect(g.world.at(b.x + 2, b.y - 2).tree).toBeGreaterThan(0);
  });

  test('a quarry breaks boulders into stone', () => {
    const g = flatGame();
    const b = placeLinked(g, 'quarry', g.hq.x - 4, g.hq.y);
    const rock = g.world.at(b.x - 2, b.y - 2);
    rock.rock = 2;
    runUntil(g, () => g.hq.stock.stone >= 16, 300);
    expect(rock.rock).toBe(0);
  });

  test('a sawmill turns logs into planks', () => {
    const g = flatGame();
    const b = placeLinked(g, 'sawmill', g.hq.x - 4, g.hq.y);
    runUntil(g, () => b.built, 200);
    const planks = totalGoods(g).plank;
    runUntil(g, () => totalGoods(g).plank >= planks + 3, 300);
    expect(totalGoods(g).log).toBeLessThan(6);
  });

  test('a forester plants saplings that grow into trees', () => {
    const g = flatGame();
    placeLinked(g, 'forester', g.hq.x + 4, g.hq.y - 3);
    const count = (min: number) => g.world.tiles.filter((t) => t.tree >= min).length;
    const before = count(1);
    runUntil(g, () => count(0.01) > before, 200);
    runUntil(g, () => count(1) > before, 200);
  });

  test('a forester never plants next to a flag', () => {
    const g = flatGame();
    const b = placeLinked(g, 'forester', g.hq.x + 4, g.hq.y - 3);
    // A lone flag near the hut, with nothing around it but the planting ground.
    const lone = g.buildRoad(b.flag, { x: b.x + 3, y: b.y + 1 });
    if (typeof lone === 'string') throw new Error(lone);
    run(g, 400);
    for (const f of g.flags.values())
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          expect(g.world.at(f.x + dx, f.y + dy).tree).toBe(0);
  });

  test('saplings grow fully in about 40 seconds', () => {
    const g = flatGame();
    const t = g.world.at(g.hq.x + 3, g.hq.y - 3);
    t.tree = 0.05;
    run(g, 20);
    expect(t.tree).toBeGreaterThan(0.05);
    expect(t.tree).toBeLessThan(1);
    run(g, 25);
    expect(t.tree).toBe(1);
  });
});

describe('logistics', () => {
  test('cutting a road mid-delivery loses no goods', () => {
    const g = flatGame();
    const before = totalGoods(g);
    placeLinked(g, 'lookout', g.hq.x + 8, g.hq.y - 2);
    runUntil(g, () => [...g.settlers.values()].some((s) => s.item), 120);
    const r = [...g.roads.values()].find((r) => g.settlers.get(r.carrier)?.item)!;
    const item = g.settlers.get(r.carrier)!.item!;
    g.removeAt(r.path[1]);
    // The carrier drops the good on the nearer flag, where it waits for a new route.
    expect([r.a, r.b].some((id) => g.flags.get(id)!.items.includes(item))).toBe(true);
    expect(totalGoods(g)).toEqual(before);
    expectIncomingConsistent(g);
    run(g, 60, () => {
      expect(totalGoods(g)).toEqual(before);
      expect(g.population).toBe(18);
      expectIncomingConsistent(g);
    });
  });

  test('removing a flag with goods on it sends them back to the HQ', () => {
    const g = flatGame();
    const before = totalGoods(g);
    placeLinked(g, 'lookout', g.hq.x + 8, g.hq.y - 2);
    const loaded = () => [...g.flags.values()].find((f) => !f.building && f.items.length);
    runUntil(g, () => !!loaded(), 120);
    const f = loaded()!;
    const stock = { ...g.hq.stock };
    expect(g.removeAt(f)).toBeNull();
    expect(g.hq.stock.plank + g.hq.stock.stone).toBeGreaterThan(stock.plank + stock.stone);
    expect(totalGoods(g)).toEqual(before);
    expectIncomingConsistent(g);
  });

  test('goods head for the building that needs them, not the HQ', () => {
    const g = flatGame();
    const saw = placeLinked(g, 'sawmill', g.hq.x - 4, g.hq.y);
    const cutter = placeLinked(g, 'woodcutter', g.hq.x + 4, g.hq.y);
    g.hq.stock.log = 0;
    g.world.at(cutter.x + 2, cutter.y - 2).tree = 1;
    runUntil(g, () => saw.built && cutter.built, 300);
    runUntil(g, () => saw.stock.log + saw.incoming.log > 0 || saw.busy, 300);
  });
});

describe('save and load', () => {
  test('a JSON round trip keeps every good and settler', () => {
    const g = flatGame();
    const before = totalGoods(g);
    const b = placeLinked(g, 'lookout', g.hq.x + 8, g.hq.y - 2);
    runUntil(g, () => [...g.settlers.values()].some((s) => s.item), 120);
    const g2 = Game.load(JSON.parse(JSON.stringify(g.save())));
    expect(totalGoods(g2)).toEqual(before);
    expect(g2.population).toBe(18);
    expect(g2.settlers.size).toBe(0);
    expect(g2.roads.size).toBe(g.roads.size);
    expect(g2.flags.size).toBe(g.flags.size);
    expectIncomingConsistent(g2);
    // The loaded game carries on and finishes the job.
    const b2 = g2.buildings.get(b.id)!;
    runUntil(g2, () => b2.built, 300);
  });

  test('a good in a worker\'s hands is put back in their hut on save', () => {
    const g = flatGame();
    const b = placeLinked(g, 'woodcutter', g.hq.x + 4, g.hq.y);
    g.world.at(b.x + 3, b.y - 2).tree = 1;
    runUntil(g, () => [...g.settlers.values()].some((s) => s.role === 'woodcutter' && s.carrying), 300);
    const before = totalGoods(g);
    const g2 = Game.load(JSON.parse(JSON.stringify(g.save())));
    expect(totalGoods(g2)).toEqual(before);
    expect(g2.buildings.get(b.id)!.out.log).toBe(1);
  });

  test('saving does not change the running game', () => {
    const g = flatGame();
    placeLinked(g, 'lookout', g.hq.x + 8, g.hq.y - 2);
    runUntil(g, () => [...g.settlers.values()].some((s) => s.item), 120);
    const goods = totalGoods(g), settlers = g.settlers.size;
    g.save();
    expect(totalGoods(g)).toEqual(goods);
    expect(g.settlers.size).toBe(settlers);
  });

  test('keeps changes to the map, such as felled trees', () => {
    const g = flatGame();
    const t = { x: g.hq.x + 5, y: g.hq.y - 5 };
    g.world.at(t.x, t.y).tree = 1;
    g.world.at(t.x + 1, t.y).rock = 2;
    const g2 = Game.load(JSON.parse(JSON.stringify(g.save())));
    expect(g2.world.at(t.x, t.y).tree).toBe(1);
    expect(g2.world.at(t.x + 1, t.y).rock).toBe(2);
  });

  test('refuses a save from another version', () => {
    const d = new Game(1).save();
    expect(() => Game.load({ ...d, v: SAVE_VERSION + 1 })).toThrow();
  });
});

describe('storehouses', () => {
  // A finished storehouse east of the HQ, joined to it by road.
  function storehouse(g: Game) {
    const s = placeLinked(g, 'storehouse', g.hq.x + 5, g.hq.y);
    runUntil(g, () => s.built, 300);
    expect(s.status).toBe('Storing goods');
    return s;
  }

  test('spare goods go to the nearest store, not the HQ', () => {
    const g = flatGame();
    const s = storehouse(g);
    // The woodcutter's only road runs through the storehouse's flag.
    const cutter = g.place('woodcutter', s.x + 3, s.y - 3);
    g.buildRoad(cutter.flag, g.flags.get(s.flag)!);
    for (const [dx, dy] of [[1, -2], [-1, -2], [2, 0]]) g.world.at(cutter.x + dx, cutter.y + dy).tree = 1;
    runUntil(g, () => cutter.built, 300);
    const hqLogs = g.hq.stock.log;
    runUntil(g, () => s.stock.log >= 2, 400, () => expectIncomingConsistent(g));
    expect(g.hq.stock.log).toBe(hqLogs);
  });

  test('sites are supplied from the nearest store that has the goods', () => {
    const g = flatGame();
    const s = storehouse(g);
    s.stock = bag({ log: 0, plank: 5, stone: 5 });
    const hq = { ...g.hq.stock };
    const site = g.place('woodcutter', s.x + 3, s.y - 3);
    g.buildRoad(site.flag, g.flags.get(s.flag)!);
    runUntil(g, () => site.built, 300);
    expect(s.stock.plank).toBe(3);
    expect(g.hq.stock).toEqual(hq);
  });

  test('when the nearest store runs out, a farther one sends the rest', () => {
    const g = flatGame();
    const s = storehouse(g);
    s.stock = bag({ log: 0, plank: 1, stone: 0 });
    const site = g.place('woodcutter', s.x + 3, s.y - 3);
    g.buildRoad(site.flag, g.flags.get(s.flag)!);
    runUntil(g, () => site.built, 300);
    expect(s.stock.plank).toBe(0);
  });

  test('the goods count adds up every store', () => {
    const g = flatGame();
    const s = storehouse(g);
    s.stock = bag({ log: 1, plank: 2, stone: 3 });
    const { log, plank, stone } = g.hq.stock;
    expect(g.stored).toEqual(bag({ log: log + 1, plank: plank + 2, stone: stone + 3 }));
  });

  test('an unfinished storehouse stores nothing', () => {
    const g = flatGame();
    const s = placeLinked(g, 'storehouse', g.hq.x + 5, g.hq.y);
    expect(g.isStore(s)).toBe(false);
  });

  test('save and load keep stored goods', () => {
    const g = flatGame();
    const s = storehouse(g);
    s.stock = bag({ log: 1, plank: 2, stone: 3 });
    const h = Game.load(JSON.parse(JSON.stringify(g.save())));
    expect(h.buildings.get(s.id)).toMatchObject({ stock: s.stock, status: 'Storing goods' });
  });
});

describe('carriers', () => {
  const carriers = (g: Game) => [...g.settlers.values()].filter((s) => s.role === 'carrier');

  test('a road with nothing to carry gets no carrier', () => {
    const g = flatGame();
    g.buildRoad(g.hq.flag, { x: g.hq.x + 9, y: g.hq.y + 1 });
    run(g, 10);
    for (const r of g.roads.values()) expect(r.carrier).toBe(0);
    expect(g.pool).toBe(18);
  });

  test('carriers go back to the HQ once their road has nothing to carry', () => {
    const g = flatGame();
    const b = placeLinked(g, 'lookout', g.hq.x + 8, g.hq.y - 2);
    runUntil(g, () => carriers(g).length > 0, 60);
    runUntil(g, () => b.built, 300);
    runUntil(g, () => carriers(g).length === 0, 60);
    for (const r of g.roads.values()) expect(r.carrier).toBe(0);
    expect(g.population).toBe(18);
  });

  test('many empty roads do not use up the settlers a building site needs', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    // Rows of roads across your land, each split into short roads by its flags.
    for (const [dy, w] of [[3, 8], [5, 7], [7, 5], [-5, 7], [-7, 5]]) {
      const start = g.startFlag({ x: x - w, y: y + dy });
      if (typeof start === 'string') throw new Error(start);
      const end = g.buildRoad(start.id, { x: x + w, y: y + dy });
      if (typeof end === 'string') throw new Error(end);
    }
    expect(g.roads.size).toBeGreaterThanOrEqual(18);
    const b = placeLinked(g, 'woodcutter', x + 4, y - 3);
    runUntil(g, () => b.built, 300);
  });
});
