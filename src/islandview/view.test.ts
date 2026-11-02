import { afterEach, describe, expect, test } from 'bun:test';
import { GOODS } from '../game/defs';
import { harbourGame, runUntil } from '../game/test-helpers';
import { setLang } from '../i18n';
import { isleView } from './view';

afterEach(() => setLang('en'));

describe('the island the stock bar shows', () => {
  test('names no island while only the home island has a store', () => {
    const { g } = harbourGame(1);
    g.hq.stock.plank = 5;
    const v = isleView(g, g.hq.x, g.hq.y);
    expect(v.label).toBe('');
    expect(v.isle).toBe('home');
    expect(v.stored.plank).toBe(g.stored.plank);
  });

  test('names the island and shows only its goods once settlers have landed', () => {
    const { g, h } = harbourGame(1);
    expect(g.sail(h)).toBeNull();
    runUntil(g, () => [...g.buildings.values()].some((b) => b.landed && b.built), 400);
    const colony = [...g.buildings.values()].find((b) => b.landed)!;
    for (const b of [g.hq, h, colony]) for (const k of GOODS) b.stock[k] = 0;
    g.hq.stock.plank = 8;
    colony.stock.plank = 2;

    const there = isleView(g, colony.x, colony.y);
    expect(there.label).toBe('Second island');
    expect(there.stored.plank).toBe(2);
    const home = isleView(g, g.hq.x, g.hq.y);
    expect(home.label).toBe('Home island');
    expect(home.stored.plank).toBe(8);

    setLang('pl');
    expect(isleView(g, colony.x, colony.y).label).toBe('Druga wyspa');
  });
});
