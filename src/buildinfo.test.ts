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
    expect(consumers('fish')).toEqual(['mine', 'house']);
    expect(consumers('flour')).toEqual(['bakery']);
  });

  test('workshops show their speed', () => {
    expect(buildFacts('sawmill').makes).toBe('Turns 1 Log into 1 Plank every 5 s. That is up to 12 a minute.');
    expect(buildFacts('mine').makes).toBe('Turns 1 Bread or Fish into 2 Stone every 8 s. That is up to 15 a minute.');
  });

  test('worth names who uses the goods', () => {
    expect(buildFacts('sawmill').worth).toContain('Every building needs Planks.');
    expect(buildFacts('woodcutter').worth).toContain('Logs feed the Sawmill.');
    expect(buildFacts('mill').worth).toContain('Flour feeds the Bakery.');
    expect(buildFacts('fisher').worth).toContain('Fish feeds the Stone Mine and House.');
    expect(buildFacts('bakery').worth).toContain('Bread feeds the Stone Mine and House.');
    expect(buildFacts('quarry').worth[0]).toMatch(/^\d+ of \d+ buildings need Stone to be built\.$/);
  });

  test('placement rules and workers are listed', () => {
    expect(buildFacts('mine').needs).toContain('Build it next to a mountain.');
    expect(buildFacts('mill').worth).toContain('Flour feeds the Bakery.');
    expect(buildFacts('fisher').needs).toContain('Build it near water.');
    expect(buildFacts('storehouse').needs).toContain('Needs no worker.');
    expect(buildFacts('woodcutter').needs).toContain('Works up to 6 tiles away.');
    for (const t of ['lookout', 'mine'] as const) expect(buildFacts(t).needs.some((n) => n.startsWith('Works up to'))).toBe(false);
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
    g.hq.stock.flour = 3;
    expect(buildNow(g, 'bakery').warn.some((w) => w.includes('You make no'))).toBe(false);
    g.hq.stock.flour = 0;
    expect(buildNow(g, 'bakery').warn).toContain('You make no Flour yet. Build a Mill first.');
  });

  test('the mine accepts either food', () => {
    const g = flatGame();
    g.hq.stock.fish = 0;
    g.hq.stock.bread = 0;
    expect(buildNow(g, 'mine').warn).toContain("You make no Bread or Fish yet. Build a Bakery or Fisher's Hut first.");
  });

  test('a house explains how it grows your settlers', () => {
    expect(buildFacts('house').makes).toBe('A family home. It turns one fish or bread into a new settler every 40 s, up to 4 settlers.');
    expect(buildFacts('house').worth).toContain('More settlers mean more carriers, builders and workers. Build more houses to keep growing.');
    const g = flatGame();
    expect(buildNow(g, 'house').warn).toContain("You make no Fish or Bread yet. Build a Fisher's Hut or Bakery first.");
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
