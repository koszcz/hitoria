import { describe, expect, test } from 'bun:test';
import { Game, SAIL_CARGO } from '.';
import { HOUSE_SIZE, RECIPES } from './defs';
import { takeSettler } from './settlers';
import { flatGame, placeLinked, run, runUntil, setClock } from './test-helpers';
import { HOUSE_EXTRA, UPGRADE_COST, UPGRADE_PACE, canUpgrade, houseSize, upgradable } from './upgrades';
import { idle } from './work';

// A finished building that settlers can walk to from the HQ.
function finished(g: Game, type: Parameters<Game['place']>[0], dx = 4, dy = 3) {
  const b = placeLinked(g, type, g.hq.x + dx, g.hq.y + dy);
  Object.assign(b, { built: true, progress: 1, status: 'Waiting for a worker' });
  return b;
}

// A game whose HQ holds iron, and more tools than the ship to the other island needs.
function rich(iron = 10, tool = 20) {
  const g = flatGame();
  Object.assign(g.hq.stock, { iron, tool });
  return g;
}

describe('building upgrades', () => {
  test('huts with a worker and houses can be upgraded; stores, towers and the monument cannot', () => {
    for (const t of ['woodcutter', 'sawmill', 'mine', 'toolmaker', 'well', 'house'] as const) expect(upgradable(t)).toBe(true);
    for (const t of ['hq', 'storehouse', 'harbour', 'lookout', 'monument'] as const) expect(upgradable(t)).toBe(false);
  });

  test('an upgrade costs iron and tools from your stores', () => {
    const g = rich(5, 12);
    const hut = finished(g, 'sawmill');
    expect(g.upgrade(hut)).toBeNull();
    expect(hut.level).toBe(2);
    expect(g.hq.stock.iron).toBe(5 - UPGRADE_COST.iron!);
    expect(g.hq.stock.tool).toBe(12 - UPGRADE_COST.tool!);
    expect(g.toasts).toContain('⬆️ Building upgraded');
  });

  test('the cost can come from several stores', () => {
    const g = rich(1, 0);
    const store = finished(g, 'storehouse', -4, 3);
    Object.assign(store.stock, { iron: 5, tool: 10 });
    const hut = finished(g, 'quarry');
    expect(g.upgrade(hut)).toBeNull();
    expect(g.hq.stock.iron + store.stock.iron).toBe(6 - UPGRADE_COST.iron!);
    expect(g.hq.stock.tool + store.stock.tool).toBe(10 - UPGRADE_COST.tool!);
  });

  test('goods a carrier is already coming for are not spent', () => {
    const g = rich(UPGRADE_COST.iron!);
    g.hq.sending.iron = 1;
    const hut = finished(g, 'sawmill');
    expect(canUpgrade(g, hut)).toBe('Not enough iron and tools in your stores');
  });

  test('a building upgrades only once, only when built, and only if it can', () => {
    const g = rich();
    const site = placeLinked(g, 'sawmill', g.hq.x + 4, g.hq.y + 3);
    expect(g.upgrade(site)).toBe('Finish building it first');
    Object.assign(site, { built: true, progress: 1 });
    expect(g.upgrade(site)).toBeNull();
    expect(g.upgrade(site)).toBe('Already upgraded');
    expect(g.upgrade(g.hq)).toBe('This building cannot be upgraded');
    expect(g.hq.stock.iron).toBe(10 - UPGRADE_COST.iron!);
  });

  test('with too little iron or tools, nothing is spent', () => {
    const g = rich(UPGRADE_COST.iron! - 1);
    const hut = finished(g, 'sawmill');
    expect(g.upgrade(hut)).toBe('Not enough iron and tools in your stores');
    expect(hut.level).toBeUndefined();
    expect(g.hq.stock.tool).toBe(20);
  });

  test('before the other island is settled, the ship keeps its tools', () => {
    const g = flatGame();
    const tools = SAIL_CARGO.tool! + UPGRADE_COST.tool! - 1;
    Object.assign(g.hq.stock, { iron: 10, tool: tools });
    const hut = finished(g, 'sawmill');
    expect(g.upgrade(hut)).toBe('Keep the tools the ship needs to settle the other island');
    g.hq.stock.tool = tools + 1;
    expect(g.upgrade(hut)).toBeNull();
  });

  test("an upgraded hut's worker takes half as long over each piece of work", () => {
    const g = rich();
    const hut = finished(g, 'sawmill');
    Object.assign(hut, { tooled: true, fed: 1000 });
    hut.stock.log = 2;
    const s = takeSettler(g, 'sawyer', hut)!;
    Object.assign(s, { home: hut.id, atWork: true, inside: true, x: hut.x, y: hut.y });
    setClock(g, 0.5); // midday, so the worker is not off to bed
    const work = () => s.tasks.find((t) => t.k === 'work')!;
    idle(g, s);
    expect(work()).toMatchObject({ t: RECIPES.sawmill!.t });
    s.tasks = [];
    hut.level = 2;
    idle(g, s);
    expect(work()).toMatchObject({ t: RECIPES.sawmill!.t * UPGRADE_PACE });
  });

  test('an upgraded house holds more settlers', () => {
    const g = rich();
    const house = finished(g, 'house');
    expect(houseSize(house)).toBe(HOUSE_SIZE);
    house.born = HOUSE_SIZE;
    run(g, 1);
    expect(house.status).toBe('House is full');
    expect(g.upgrade(house)).toBeNull();
    expect(houseSize(house)).toBe(HOUSE_SIZE + HOUSE_EXTRA);
    g.hq.stock.fish = 4;
    runUntil(g, () => house.born === HOUSE_SIZE + 1, 200);
  });

  test('the upgrade is kept in a save', () => {
    const g = rich();
    const hut = finished(g, 'sawmill');
    g.upgrade(hut);
    const l = Game.load(JSON.parse(JSON.stringify(g.save())));
    expect(l.buildings.get(hut.id)!.level).toBe(2);
  });
});
