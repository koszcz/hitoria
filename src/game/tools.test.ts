import { describe, expect, test } from 'bun:test';
import { Game, SAIL_CARGO } from '.';
import { BDEFS, BUILDABLE, RECIPES } from './defs';
import { demolish } from './demolish';
import { flatGame, placeLinked, run, runUntil, expectIncomingConsistent } from './test-helpers';
import { needsTool, NO_TOOL, START_TOOLS, TOOLS_LOW } from './tools';

// A finished building with a road to the HQ, still waiting for its worker.
function finished(g: Game, type: Parameters<Game['place']>[0], dx = 4, dy = 3) {
  const b = placeLinked(g, type, g.hq.x + dx, g.hq.y + dy);
  Object.assign(b, { built: true, progress: 1 });
  return b;
}

describe('tools', () => {
  test('the HQ starts with tools, and a toolmaker makes 1 tool from 1 iron and 1 plank', () => {
    expect(new Game(1).hq.stock.tool).toBe(START_TOOLS);
    expect(BUILDABLE).toContain('toolmaker');
    expect(BDEFS.toolmaker.worker).toBe('toolmaker');
    const rc = RECIPES.toolmaker!;
    expect([rc.from, rc.with, rc.to, rc.n]).toEqual([['iron'], 'plank', 'tool', 1]);
  });

  test('workers in huts need a tool, but scouts, builders and carriers do not', () => {
    expect(needsTool('woodcutter')).toBe(true);
    expect(needsTool('toolmaker')).toBe(true);
    expect(needsTool('lookout')).toBe(false);
    expect(needsTool('house')).toBe(false);
    expect(needsTool('storehouse')).toBe(false);
  });

  test('a new worker takes 1 tool from the HQ, and keeps it in their hut', () => {
    const g = flatGame();
    const hut = finished(g, 'woodcutter');
    runUntil(g, () => !!hut.tooled, 60);
    expect(g.hq.stock.tool).toBe(START_TOOLS - 1);
    expect(hut.worker).toBeTruthy();
  });

  test('a hut waits for a tool when the stores have none', () => {
    const g = flatGame();
    g.hq.stock.tool = 0;
    const hut = finished(g, 'woodcutter');
    run(g, 20);
    expect(hut.worker).toBe(0);
    expect(hut.status).toBe(NO_TOOL);
    g.hq.stock.tool = 1;
    runUntil(g, () => !!hut.tooled, 60);
    expect(g.hq.stock.tool).toBe(0);
  });

  test('two huts and one tool: only one gets a worker', () => {
    const g = flatGame();
    g.hq.stock.tool = 1;
    const a = finished(g, 'woodcutter', 4, 3);
    const b = finished(g, 'quarry', -4, 3);
    run(g, 40);
    expect([a, b].filter((h) => h.tooled).length).toBe(1);
    expect([a, b].filter((h) => h.status === NO_TOOL).length).toBe(1);
    expect(g.hq.stock.tool).toBe(0);
  });

  test('a scout needs no tool', () => {
    const g = flatGame();
    g.hq.stock.tool = 0;
    const tower = finished(g, 'lookout');
    runUntil(g, () => !!tower.worker, 30);
  });

  test('a worker who comes back to a hut that has its tool needs no new one', () => {
    const g = flatGame();
    const hut = finished(g, 'woodcutter');
    runUntil(g, () => !!hut.tooled, 60);
    // A save and load sends every worker home. They walk back without a new tool.
    const l = Game.load(JSON.parse(JSON.stringify(g.save())));
    const again = l.buildings.get(hut.id)!;
    expect(again.tooled).toBe(true);
    runUntil(l, () => !!again.worker, 30);
    run(l, 10);
    expect(l.hq.stock.tool).toBe(START_TOOLS - 1);
  });

  test('a worker takes the tool from the nearest store that has one', () => {
    const g = flatGame();
    g.hq.stock.tool = 0;
    const store = finished(g, 'storehouse', 6, -3);
    store.stock.tool = 1;
    const hut = finished(g, 'woodcutter', 8, -3);
    runUntil(g, () => !!hut.tooled, 60, () => expectIncomingConsistent(g));
    expect(store.stock.tool).toBe(0);
  });

  test('demolishing a hut sends its tool back to the HQ', () => {
    const g = flatGame();
    const hut = finished(g, 'woodcutter');
    runUntil(g, () => !!hut.tooled, 60);
    expect(demolish(g, hut)).toBeNull();
    expect(g.hq.stock.tool).toBe(START_TOOLS);
  });

  test('demolishing a hut while its worker carries the tool there puts the tool back', () => {
    const g = flatGame();
    const hut = finished(g, 'woodcutter', 6, 5);
    runUntil(g, () => [...g.settlers.values()].some((s) => s.carrying === 'tool'), 30);
    demolish(g, hut);
    run(g, 30);
    expect(g.hq.stock.tool).toBe(START_TOOLS);
    expect(g.hq.sending.tool).toBe(0);
  });

  test('saving while a worker carries a tool keeps the tool', () => {
    const g = flatGame();
    const hut = finished(g, 'woodcutter', 6, 5);
    runUntil(g, () => [...g.settlers.values()].some((s) => s.carrying === 'tool'), 30);
    const d = g.save();
    const hq = d.buildings.find((b) => b.id === g.hq.id)!, saved = d.buildings.find((b) => b.id === hut.id)!;
    expect(hq.stock.tool + saved.out.tool).toBe(START_TOOLS);
  });

  test('a toolmaker turns iron and planks into tools for the stores', () => {
    const g = flatGame();
    const shop = finished(g, 'toolmaker');
    Object.assign(g.hq.stock, { iron: 2 });
    runUntil(g, () => g.made.tool >= 2, 120, () => expectIncomingConsistent(g));
    runUntil(g, () => g.hq.stock.tool >= START_TOOLS + 1, 60); // one tool went to the toolmaker's own worker
    expect(shop.status).not.toBe(NO_TOOL);
  });

  test('a toolmaker with iron but no planks waits for planks', () => {
    const g = flatGame();
    const shop = finished(g, 'toolmaker');
    Object.assign(g.hq.stock, { iron: 2, plank: 0 });
    runUntil(g, () => shop.status === 'Waiting for planks', 60);
  });

  test('the ship takes tools for the other island', () => {
    expect(SAIL_CARGO.tool).toBeGreaterThan(0);
  });

  test('a save from before tools gives the HQ its tools and lets old huts keep working', () => {
    const g = flatGame();
    const hut = finished(g, 'woodcutter');
    const d = JSON.parse(JSON.stringify(g.save()));
    d.v = 4;
    for (const b of d.buildings) {
      delete b.stock.tool;
      delete b.out.tool;
      delete b.tooled;
    }
    const l = Game.load(d);
    expect(l.hq.stock.tool).toBe(START_TOOLS);
    expect(l.buildings.get(hut.id)!.tooled).toBe(true);
  });
});

describe('the low tools warning', () => {
  const warning = (g: Game) => g.toasts.filter((t) => t.startsWith('⚠️ Only')).length;

  test('the game warns once when the tools left are close to what the ship needs', () => {
    const g = flatGame();
    g.hq.stock.tool = TOOLS_LOW + 1;
    run(g, 1);
    expect(warning(g)).toBe(0);
    g.hq.stock.tool = TOOLS_LOW;
    run(g, 1);
    expect(g.toasts).toContain(`⚠️ Only ${TOOLS_LOW} tools left. The ship needs ${SAIL_CARGO.tool} to settle the other island`);
    g.hq.stock.tool = TOOLS_LOW - 1;
    run(g, 1);
    expect(warning(g)).toBe(1);
  });

  test('it warns again if tools run low a second time', () => {
    const g = flatGame();
    g.hq.stock.tool = TOOLS_LOW;
    run(g, 1);
    g.hq.stock.tool = TOOLS_LOW + 3;
    run(g, 1);
    g.hq.stock.tool = TOOLS_LOW - 2;
    run(g, 1);
    expect(warning(g)).toBe(2);
  });

  test('once the other island is settled, low tools need no warning', () => {
    const g = flatGame();
    const store = placeLinked(g, 'storehouse', g.hq.x + 4, g.hq.y + 3);
    store.landed = true;
    g.hq.stock.tool = 2;
    run(g, 1);
    expect(warning(g)).toBe(0);
  });
});
