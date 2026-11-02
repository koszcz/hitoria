import { describe, expect, test } from 'bun:test';
import { BUILDABLE } from './game';
import { buildFacts, buildNow, consumers, makes, producers } from './buildinfo';
import { flatGame } from './game/test-helpers';

describe('build card facts', () => {
  test('every buildable building explains what it does and what it needs', () => {
    for (const t of BUILDABLE) {
      const f = buildFacts(t);
      expect(f.makes.length).toBeGreaterThan(0);
      expect(f.needs.some((n) => n.startsWith('Takes ') && n.includes(' s to build'))).toBe(true);
      expect(f.worth.length + (makes(t) ? 1 : 0)).toBeGreaterThan(0);
    }
  });

  test('the goods chain is read from the recipes', () => {
    expect(makes('sawmill')).toBe('plank');
    expect(makes('woodcutter')).toBe('log');
    expect(makes('lookout')).toBeNull();
    expect(producers('stone')).toEqual(['quarry', 'mine']);
    expect(consumers('fish')).toEqual(['mine', 'house', 'coalmine', 'ironmine']);
    expect(producers('coal')).toEqual(['coalmine']);
    expect(producers('ore')).toEqual(['ironmine']);
    expect(consumers('coal')).toEqual(['smelter']);
    expect(consumers('ore')).toEqual(['smelter']);
    expect(producers('iron')).toEqual(['smelter']);
    expect(consumers('iron')).toEqual(['toolmaker']);
    expect(producers('tool')).toEqual(['toolmaker']);
    expect(consumers('flour')).toEqual(['bakery']);
    expect(makes('well')).toBe('water');
    expect(producers('water')).toEqual(['well']);
    expect(consumers('water')).toEqual(['bakery']);
  });

  test('the card says which workers eat', () => {
    expect(buildFacts('sawmill').needs).toContain('Its worker eats 1 Fish, Meat or Bread every 60 s of work. With no food, they work at half speed.');
    expect(buildFacts('fisher').needs).toContain('Its worker eats from what the hut makes, 1 every 60 s of work.');
    for (const t of ['mine', 'lookout', 'house'] as const) expect(buildFacts(t).needs.some((n) => n.includes(' eats '))).toBe(false);
  });

  test('workshops show their speed', () => {
    expect(buildFacts('sawmill').makes).toBe('Turns 1 Log into 1 Plank every 5 s. That is up to 12 a minute.');
    expect(buildFacts('mine').makes).toBe('Turns 1 Bread, Fish or Meat into 2 Stone every 8 s. That is up to 15 a minute.');
    expect(buildFacts('coalmine').makes).toBe('Turns 1 Bread, Fish or Meat into 2 Coal every 8 s. That is up to 15 a minute.');
    expect(buildFacts('ironmine').makes).toBe('Turns 1 Bread, Fish or Meat into 2 Iron Ore every 8 s. That is up to 15 a minute.');
    expect(buildFacts('bakery').makes).toBe('Turns 1 Flour and 1 Water into 1 Bread every 6 s. That is up to 10 a minute.');
    expect(buildFacts('well').makes).toBe('Draws 1 Water from the ground every 5 s. It needs no other goods.');
    expect(buildFacts('well').worth).toContain('Water feeds the Bakery.');
  });

  test('worth names who uses the goods', () => {
    expect(buildFacts('sawmill').worth).toContain('Every building needs Planks.');
    expect(buildFacts('woodcutter').worth).toContain('Logs feed the Sawmill.');
    expect(buildFacts('mill').worth).toContain('Flour feeds the Bakery.');
    expect(buildFacts('fisher').worth).toContain('Fish feeds the Stone Mine, House, Coal Mine and Iron Mine.');
    expect(buildFacts('bakery').worth).toContain('Bread feeds the Stone Mine, House, Coal Mine and Iron Mine.');
    expect(buildFacts('quarry').worth[0]).toMatch(/^\d+ of \d+ buildings need Stone to be built\.$/);
  });

  test('coal and iron ore feed the smelter, and iron feeds the toolmaker', () => {
    expect(buildFacts('coalmine').worth).toContain('Coal feeds the Smelter.');
    expect(buildFacts('ironmine').worth).toContain('Iron Ore feeds the Smelter.');
    expect(buildFacts('smelter').makes).toBe('Turns 1 Iron Ore and 1 Coal into 1 Iron every 6 s. That is up to 10 a minute.');
    expect(buildFacts('smelter').worth).toContain("Iron feeds the Toolmaker's Workshop.");
  });

  test('the toolmaker says what tools are for, and huts say their worker takes a tool', () => {
    const shop = buildFacts('toolmaker');
    expect(shop.makes).toBe('Turns 1 Iron and 1 Plank into 1 Tool every 8 s. That is up to 8 a minute.');
    expect(shop.worth).toEqual(['Every new worker in a hut needs 1 tool. When the tools you started with run out, new huts wait for one. The workshop gets the next free tool before any other hut.']);
    expect(buildFacts('woodcutter').needs).toContain('Takes 1 idle settler as its worker, and 1 tool from your stores.');
    expect(buildFacts('lookout').needs).toContain('Takes 1 idle settler as its worker.');
  });

  test('placement rules and workers are listed', () => {
    for (const t of ['mine', 'coalmine', 'ironmine'] as const) expect(buildFacts(t).needs).toContain('Build it next to a mountain, or on its edge with grass in front.');
    expect(buildFacts('mill').worth).toContain('Flour feeds the Bakery.');
    expect(buildFacts('fisher').needs).toContain('Build it near water.');
    expect(buildFacts('storehouse').needs).toContain('Needs no worker.');
    expect(buildFacts('woodcutter').needs).toContain('Works up to 6 tiles away.');
    for (const t of ['lookout', 'mine', 'coalmine', 'ironmine'] as const) expect(buildFacts(t).needs.some((n) => n.startsWith('Works up to'))).toBe(false);
  });
});

describe('build card notes about your game', () => {
  test('counts built and planned buildings', () => {
    const g = flatGame();
    const { x, y } = g.hq;
    expect(buildNow(g, 'woodcutter').have).toBe('You have none yet.');
    g.place('woodcutter', x + 4, y);
    expect(buildNow(g, 'woodcutter').have).toBe('You have 0 built and 1 being built.');
    g.buildings.get([...g.buildings.keys()].pop()!)!.built = true;
    expect(buildNow(g, 'woodcutter').have).toBe('You have 1 built.');
  });

  test("warns when nothing makes a workshop's input", () => {
    const g = flatGame();
    const { x, y } = g.hq;
    for (const b of g.buildings.values()) b.stock.grain = 0;
    expect(buildNow(g, 'mill').warn).toContain('You make no Grain yet. Build a Farm first.');
    g.place('farm', x + 4, y);
    expect(buildNow(g, 'mill').warn.some((w) => w.includes('You make no'))).toBe(false);
  });

  test('stock in store also counts as supply', () => {
    const g = flatGame();
    Object.assign(g.hq.stock, { flour: 3, water: 3 });
    expect(buildNow(g, 'bakery').warn.some((w) => w.includes('You make no'))).toBe(false);
    g.hq.stock.flour = 0;
    expect(buildNow(g, 'bakery').warn).toEqual(['You make no Flour yet. Build a Mill first.']);
  });

  test('a bakery warns about flour and water on their own', () => {
    const g = flatGame();
    Object.assign(g.hq.stock, { flour: 3, water: 0 });
    expect(buildNow(g, 'bakery').warn).toEqual(['You make no Water yet. Build a Well first.']);
    g.hq.stock.flour = 0;
    expect(buildNow(g, 'bakery').warn).toEqual([
      'You make no Flour yet. Build a Mill first.',
      'You make no Water yet. Build a Well first.',
    ]);
    g.place('well', g.hq.x + 4, g.hq.y);
    expect(buildNow(g, 'bakery').warn).toEqual(['You make no Flour yet. Build a Mill first.']);
  });

  test('the mine accepts either food', () => {
    const g = flatGame();
    g.hq.stock.fish = 0;
    g.hq.stock.bread = 0;
    expect(buildNow(g, 'smelter').warn).toEqual(['You make no Iron Ore yet. Build an Iron Mine first.', 'You make no Coal yet. Build a Coal Mine first.']);
    expect(buildNow(g, 'mine').warn).toContain("You make no Bread, Fish or Meat yet. Build a Bakery, Fisher's Hut or Hunter's Lodge first.");
  });

  test('a hut warns when no tools are left', () => {
    const g = flatGame();
    expect(buildNow(g, 'woodcutter').warn).toEqual([]);
    g.hq.stock.tool = 0;
    expect(buildNow(g, 'woodcutter').warn).toEqual(["You have no tools left. Its worker will wait until a Toolmaker's Workshop makes one."]);
    expect(buildNow(g, 'lookout').warn).toEqual([]);
  });

  test('a hut warns when the island the player looks at has no tools, even with tools back home', () => {
    const g = flatGame();
    const island = { ...g.stored, tool: 0 };
    expect(g.stored.tool).toBe(20);
    expect(buildNow(g, 'woodcutter', island).warn).toEqual(["You have no tools left. Its worker will wait until a Toolmaker's Workshop makes one."]);
  });

  test('a house explains how it grows your settlers', () => {
    expect(buildFacts('house').makes).toBe('A family home. It turns one fish, meat or bread into a new settler every 40 s, up to 4 settlers. A different food from last time grows the settler faster.');
    expect(buildFacts('house').worth).toContain('More settlers mean more carriers, builders and workers. Build more houses to keep growing.');
    const g = flatGame();
    expect(buildNow(g, 'house').warn).toContain("You make no Fish, Bread or Meat yet. Build a Fisher's Hut, Bakery or Hunter's Lodge first.");
    g.hq.stock.fish = 1;
    expect(buildNow(g, 'house').warn).toEqual([]);
  });

  test('a forester without woodcutters gets a warning', () => {
    const g = flatGame();
    expect(buildNow(g, 'forester').warn).toContain("New trees only help once a Woodcutter's Hut fells them.");
  });

  test('warns when no settler is free to work', () => {
    const g = flatGame();
    g.pool = 0;
    expect(buildNow(g, 'quarry').warn).toContain('No idle settlers right now. It will wait for a worker.');
    expect(buildNow(g, 'storehouse').warn.some((w) => w.includes('idle settlers'))).toBe(false);
  });
});
