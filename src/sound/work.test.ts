import { describe, expect, test } from 'bun:test';
import { flatGame, placeLinked, runUntil } from '../game/test-helpers';
import { beats, workMix, workSources, type WorkSource } from './work';

describe('workSources', () => {
  test('a quiet settlement makes no work sounds', () => {
    expect(workSources(flatGame())).toEqual([]);
  });

  test('a builder at work hammers at the site', () => {
    const g = flatGame();
    const b = placeLinked(g, 'lookout', g.hq.x + 4, g.hq.y);
    runUntil(g, () => g.settlers.get(b.builder)?.anim === 'hammer', 120);
    const s = g.settlers.get(b.builder)!;
    expect(workSources(g)).toContainEqual({ kind: 'hammer', x: s.x, y: s.y });
  });

  test('a woodcutter felling a tree chops', () => {
    const g = flatGame();
    const b = placeLinked(g, 'woodcutter', g.hq.x + 4, g.hq.y);
    g.world.at(b.x + 2, b.y - 2).tree = 1;
    runUntil(g, () => workSources(g).some((w) => w.kind === 'chop'), 300);
  });

  test('a stonecutter breaking stone hammers', () => {
    const g = flatGame();
    const b = placeLinked(g, 'quarry', g.hq.x - 4, g.hq.y);
    g.world.at(b.x - 2, b.y - 2).rock = 2;
    runUntil(g, () => [...g.settlers.values()].some((s) => s.anim === 'mine'), 300);
    expect(workSources(g).some((w) => w.kind === 'hammer')).toBe(true);
  });

  test('a sawmill saws while it works on a log, at the building', () => {
    const g = flatGame();
    const b = placeLinked(g, 'sawmill', g.hq.x - 4, g.hq.y);
    runUntil(g, () => b.busy, 300);
    expect(workSources(g)).toContainEqual({ kind: 'saw', x: b.x, y: b.y });
  });

  test('a toolmaker hammers while it makes a tool', () => {
    const g = flatGame();
    const b = placeLinked(g, 'toolmaker', g.hq.x - 4, g.hq.y);
    runUntil(g, () => b.built, 300);
    b.stock.iron = 2;
    b.stock.plank = 2;
    runUntil(g, () => b.busy, 300);
    expect(workSources(g)).toContainEqual({ kind: 'hammer', x: b.x, y: b.y });
  });
});

describe('workMix', () => {
  const view = { x: 10, y: 10, zoom: 1.3, muted: false };
  const at = (kind: WorkSource['kind'], x: number, y = 10): WorkSource => ({ kind, x, y });

  test('is silent with no work going on', () => {
    expect(workMix([], view)).toEqual({ chop: 0, saw: 0, hammer: 0 });
  });

  test('is silent when muted', () => {
    expect(workMix([at('chop', 10)], { ...view, muted: true })).toEqual({ chop: 0, saw: 0, hammer: 0 });
  });

  test('work under the camera is heard, and only its own sound', () => {
    const m = workMix([at('saw', 10)], view);
    expect(m.saw).toBeGreaterThan(0);
    expect(m.chop).toBe(0);
    expect(m.hammer).toBe(0);
  });

  test('closer work is louder, and work far away is not heard', () => {
    const near = workMix([at('chop', 11)], view).chop;
    const mid = workMix([at('chop', 16)], view).chop;
    expect(near).toBeGreaterThan(mid);
    expect(workMix([at('chop', 40)], view).chop).toBe(0);
  });

  test('more workers are louder, but never above half volume', () => {
    const one = workMix([at('hammer', 10)], view).hammer;
    const many = workMix(Array.from({ length: 30 }, () => at('hammer', 10)), view).hammer;
    expect(many).toBeGreaterThan(one);
    expect(many).toBeLessThanOrEqual(0.5);
  });

  test('zooming out makes work quieter, and far out it fades away', () => {
    const work = [at('saw', 10)];
    expect(workMix(work, { ...view, zoom: 0.8 }).saw).toBeLessThan(workMix(work, view).saw);
    expect(workMix(work, { ...view, zoom: 0.35 }).saw).toBe(0);
  });
});

describe('beats', () => {
  test('plans every beat from the next one up to the planning horizon', () => {
    expect(beats(1, 1, 0.5, 0.2)).toEqual({ at: [1, 1.2, 1.4], next: 1.6 });
  });

  test('never plans in the past, after the tab was hidden', () => {
    const r = beats(0.5, 10, 0.3, 0.2);
    expect(r.at[0]).toBeGreaterThanOrEqual(10);
  });

  test('plans nothing when the next beat is beyond the horizon', () => {
    expect(beats(5, 1, 0.5, 0.2)).toEqual({ at: [], next: 5 });
  });
});
