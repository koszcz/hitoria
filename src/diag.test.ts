import { describe, expect, test } from 'bun:test';
import { Diagnostics, LIMITS } from './diag';
import { flatGame, run, placeBare, wallOff } from './game/test-helpers';

function watched(seed = 1) {
  const g = flatGame(seed);
  const d = new Diagnostics();
  d.attach(g);
  return { g, d, run: (s: number) => run(g, s, () => d.tick()) };
}

describe('diagnostics', () => {
  test('flags a building that waits too long, and clears it once fixed', () => {
    const { g, d, run } = watched();
    g.hq.stock.plank = 0; // the site can never get its planks
    const b = placeBare(g, 'woodcutter', g.hq.x + 4, g.hq.y + 1);
    const r = g.buildRoad(b.flag, g.flags.get(g.hq.flag)!);
    if (typeof r === 'string') throw new Error(r);
    run(LIMITS.buildingWaiting + 15);
    expect(d.issues.get(`b${b.id}`)?.text).toContain('Waiting for materials');
    expect(d.events.some((e) => e.includes('Long wait'))).toBe(true);

    g.hq.stock.plank = 10;
    run(30);
    expect(d.issues.has(`b${b.id}`)).toBe(false);
    expect(d.events.some((e) => e.includes('Resolved'))).toBe(true);
  });

  test('flags a site that nobody can walk to from the HQ', () => {
    const { g, d, run } = watched();
    const b = placeBare(g, 'woodcutter', g.hq.x + 6, g.hq.y + 1);
    wallOff(g, b);
    run(LIMITS.buildingWaiting + 15);
    expect(d.issues.get(`b${b.id}`)?.text).toContain('No way to walk to your HQ');
  });

  test('flags a building that waits for a settler while none are idle, and clears it once one is free', () => {
    const { g, d, run } = watched();
    g.pool = 0;
    const b = placeBare(g, 'woodcutter', g.hq.x + 4, g.hq.y + 1);
    const r = g.buildRoad(b.flag, g.flags.get(g.hq.flag)!);
    if (typeof r === 'string') throw new Error(r);
    run(LIMITS.noSettlers + 5);
    expect(d.issues.get('pool')?.text).toContain('No idle settlers in the HQ');
    expect(d.issues.get('pool')?.text).toContain('Woodcutter');

    g.pool = 5; // carriers take some first, so free a few
    run(5);
    expect(d.issues.has('pool')).toBe(false);
  });

  test('reports nothing stuck in a healthy game', () => {
    const { g, d, run } = watched();
    const b = placeBare(g, 'woodcutter', g.hq.x + 4, g.hq.y + 1);
    const r = g.buildRoad(b.flag, g.flags.get(g.hq.flag)!);
    if (typeof r === 'string') throw new Error(r);
    run(120);
    expect([...d.issues.values()]).toEqual([]);
    expect(d.events.some((e) => e.includes('finished'))).toBe(true);
  });

  test('keeps a timeline and builds a report', () => {
    const { d, run } = watched();
    run(35);
    expect(d.samples.length).toBe(4);
    const text = d.report();
    expect(text).toContain('### Timeline');
    expect(text).toContain('### Recent events');
  });

  test('builds a snapshot with every building, settler and the idle count', () => {
    const { g, d, run } = watched();
    const b = placeBare(g, 'woodcutter', g.hq.x + 4, g.hq.y + 1);
    const r = g.buildRoad(b.flag, g.flags.get(g.hq.flag)!);
    if (typeof r === 'string') throw new Error(r);
    run(60);
    const text = d.snapshot();
    expect(text).toContain(`idle in the HQ ${g.pool}`);
    expect(text).toContain(`Woodcutter's Hut #${b.id} | ${b.x},${b.y} | yes`);
    expect(text).toMatch(/trees \d+ grown/);
    expect(g.settlers.size).toBeGreaterThan(0);
    for (const s of g.settlers.values()) expect(text).toContain(`${s.role} #${s.id} |`);
    for (const road of g.roads.values()) expect(text).toContain(`#${road.id} | #${road.a}-#${road.b} |`);
  });

  test('says so when no game is watched', () => {
    expect(new Diagnostics().snapshot()).toBe('(no game running)');
  });
});
