// Unlocking buildings step by step: which ones a new island starts with, and what finishing one opens.
import { describe, expect, test } from 'bun:test';
import { BUILDABLE, Game, type BType } from '.';
import { NEEDS, STARTERS, isUnlocked, unlockAll } from './unlocks';
import { flatGame, placeLinked, runUntil } from './test-helpers';

// A flat test game with only the starting buildings unlocked, as on a new island.
function freshGame() {
  const g = flatGame();
  g.finished.clear();
  for (const t of BUILDABLE) expect(isUnlocked(g, t)).toBe(STARTERS.includes(t));
  return g;
}

// Finish a building of `type` next to the HQ, the way a player would.
function finish(g: Game, type: BType) {
  const b = placeLinked(g, type, g.hq.x + 3, g.hq.y + 3);
  g.toasts.length = 0;
  runUntil(g, () => b.built, 300);
  return b;
}

describe('unlocks', () => {
  test('a new island can build only the Woodcutter, Quarry, Fisher and House', () => {
    const g = new Game(1);
    expect(BUILDABLE.filter((t) => isUnlocked(g, t))).toEqual(['woodcutter', 'quarry', 'fisher', 'house']);
    expect(g.locked('woodcutter')).toBeNull();
    expect(g.locked('sawmill')).toBe("Locked. Finish the Woodcutter's Hut first");
    expect(g.locked('bakery')).toBe('Locked. Finish the Mill and Well first');
    expect(g.locked('smelter')).toBe('Locked. Finish the Coal Mine and Iron Mine first');
  });

  test('every building is a starter or has buildings to finish first', () => {
    for (const t of BUILDABLE) expect(STARTERS.includes(t)).toBe(!NEEDS[t]);
  });

  test('every building can be reached from the starters', () => {
    const g = freshGame();
    for (let more = true; more; ) {
      more = false;
      for (const t of BUILDABLE)
        if (isUnlocked(g, t) && !g.finished.has(t)) {
          g.finished.add(t);
          more = true;
        }
    }
    expect([...g.finished].sort()).toEqual([...BUILDABLE].sort());
  });

  test('finishing a Woodcutter unlocks the Forester and Sawmill, with a message', () => {
    const g = freshGame();
    finish(g, 'woodcutter');
    expect(g.locked('forester')).toBeNull();
    expect(g.locked('sawmill')).toBeNull();
    expect(g.locked('farm')).toBe('Locked. Finish the Sawmill first');
    expect(g.toasts).toContain("🔓 Unlocked: Forester's Hut, Sawmill");
  });

  test('a second building of the same kind unlocks nothing new', () => {
    const g = freshGame();
    finish(g, 'woodcutter');
    const b = placeLinked(g, 'woodcutter', g.hq.x - 3, g.hq.y + 3);
    g.toasts.length = 0;
    runUntil(g, () => b.built, 300);
    expect(g.toasts.filter((t) => t.startsWith('🔓'))).toEqual([]);
  });

  test('a building that needs two others unlocks only when both are finished', () => {
    const g = freshGame();
    g.finished.add('farm');
    g.finished.add('mill');
    expect(g.locked('bakery')).toBe('Locked. Finish the Well first');
    g.finished.add('well');
    expect(g.locked('bakery')).toBeNull();
  });

  test('an unlock stays when its building is removed', () => {
    const g = freshGame();
    const b = finish(g, 'woodcutter');
    expect(g.removeAt(b)).toBeNull();
    expect(g.locked('sawmill')).toBeNull();
  });

  test('a site of a locked building is not finished, so it unlocks nothing', () => {
    const g = freshGame();
    placeLinked(g, 'woodcutter', g.hq.x + 3, g.hq.y + 3);
    expect(g.locked('sawmill')).toBe("Locked. Finish the Woodcutter's Hut first");
  });

  test('unlocks are saved', () => {
    const g = freshGame();
    finish(g, 'quarry');
    const g2 = Game.load(JSON.parse(JSON.stringify(g.save())));
    expect(g2.locked('mine')).toBeNull();
    expect(g2.locked('geologist')).toBe('Locked. Finish the Stone Mine first');
  });

  test('an old save unlocks what its finished buildings have earned', () => {
    const g = freshGame();
    finish(g, 'woodcutter');
    placeLinked(g, 'quarry', g.hq.x - 3, g.hq.y + 3); // only a site, so it earns nothing
    const old = JSON.parse(JSON.stringify(g.save()));
    delete old.finished;
    const g2 = Game.load(old);
    expect(BUILDABLE.filter((t) => isUnlocked(g2, t))).toEqual(['woodcutter', 'forester', 'quarry', 'sawmill', 'fisher', 'house']);
  });

  test('unlockAll unlocks every building', () => {
    const g = freshGame();
    unlockAll(g);
    expect(BUILDABLE.filter((t) => !isUnlocked(g, t))).toEqual([]);
  });
});
