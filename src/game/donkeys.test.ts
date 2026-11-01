// Pack donkeys: when they join the carriers, what they carry, and that they never lose goods.
import { describe, expect, test } from 'bun:test';
import { Game } from '.';
import { DONKEY_BUSY, DONKEY_LOAD, donkeyCap } from './donkeys';
import { expectIncomingConsistent, flatGame, placeLinked, run, runUntil, totalGoods } from './test-helpers';

const donkeys = (g: Game) => [...g.donkeys.values()];

// A game where many goods wait to move: a monument site needs 26 goods from the HQ.
function busyGame() {
  const g = flatGame();
  g.hq.stock.plank += 20;
  g.hq.stock.stone += 20;
  const m = placeLinked(g, 'monument', g.hq.x + 8, g.hq.y - 2);
  return { g, m };
}

describe('pack donkeys', () => {
  test('with only a few goods to move, no donkey comes out', () => {
    const g = flatGame();
    const b = placeLinked(g, 'lookout', g.hq.x + 8, g.hq.y - 2); // needs 6 goods
    expect(6).toBeLessThan(DONKEY_BUSY);
    runUntil(g, () => b.built, 300, () => expect(g.donkeys.size).toBe(0));
  });

  test('when many goods wait, a donkey joins the carriers and carries two goods at once', () => {
    const { g } = busyGame();
    runUntil(g, () => donkeys(g).some((d) => d.carrying), 60);
    const d = donkeys(g).find((d) => d.carrying)!;
    expect(d.load).toBe(DONKEY_LOAD);
    expect(d.job!.n).toBe(DONKEY_LOAD);
  });

  test('the first donkey of a game brings a message', () => {
    const { g } = busyGame();
    runUntil(g, () => g.donkeys.size > 0, 60);
    expect(g.toasts).toContain('🫏 A pack donkey joins your carriers');
  });

  test('donkeys are not settlers: they take nobody from the HQ', () => {
    const { g } = busyGame();
    runUntil(g, () => g.donkeys.size > 0, 60, () => expect(g.population).toBe(18));
    run(g, 20, () => expect(g.population).toBe(18));
  });

  test('a donkey goes back to the HQ once the work is done', () => {
    const { g, m } = busyGame();
    runUntil(g, () => g.donkeys.size > 0, 60);
    runUntil(g, () => m.built, 600);
    runUntil(g, () => g.donkeys.size === 0, 120);
  });

  test('donkeys deliver every good the site needs, and no good is lost or promised twice', () => {
    const { g, m } = busyGame();
    const before = totalGoods(g);
    runUntil(g, () => m.built, 600, () => expectIncomingConsistent(g));
    const after = totalGoods(g);
    expect(after.plank).toBe(before.plank - 10);
    expect(after.stone).toBe(before.stone - 16);
  });

  test('a small village has one donkey, and a bigger one gets more', () => {
    const { g } = busyGame();
    expect(donkeyCap(g)).toBe(1);
    run(g, 60, () => expect(g.donkeys.size).toBeLessThanOrEqual(donkeyCap(g)));
    for (let i = 0; i < 6; i++) placeLinked(g, 'well', g.hq.x - 6 + i * 2, g.hq.y + 6);
    expect(donkeyCap(g)).toBeGreaterThan(1);
  });

  test('a donkey takes finished goods from a hut to a store, two at a time', () => {
    const g = flatGame();
    const hut = placeLinked(g, 'woodcutter', g.hq.x + 6, g.hq.y + 2);
    Object.assign(hut, { built: true, progress: 1 });
    hut.out.log = 4;
    placeLinked(g, 'monument', g.hq.x - 8, g.hq.y - 2); // keeps the carriers busy
    runUntil(g, () => donkeys(g).some((d) => d.job?.from === hut.id && d.carrying === 'log'), 60);
  });

  // A donkey whose walk fails gives up the trip; nothing is lost or left promised.
  for (const [when, holding] of [['before', false], ['after', true]] as const)
    test(`a donkey trip given up ${when} the pickup loses no goods`, () => {
      const { g } = busyGame();
      const before = totalGoods(g);
      runUntil(g, () => donkeys(g).some((d) => d.job && !!d.carrying === holding), 120);
      const d = donkeys(g).find((d) => d.job && !!d.carrying === holding)!;
      d.onAbort!();
      expect(g.donkeys.has(d.id)).toBe(false);
      expect(totalGoods(g)).toEqual(before);
      expectIncomingConsistent(g);
      expect(g.population).toBe(18);
    });

  test('demolishing the site sends a loaded donkey home with its goods', () => {
    const { g, m } = busyGame();
    const before = totalGoods(g);
    runUntil(g, () => donkeys(g).some((d) => d.carrying), 60);
    g.removeAt(m);
    expect(totalGoods(g)).toEqual(before);
    expectIncomingConsistent(g);
    runUntil(g, () => g.donkeys.size === 0, 120);
    expect(g.population).toBe(18);
  });

  test('saving while a donkey carries goods loses none of them', () => {
    const { g } = busyGame();
    runUntil(g, () => donkeys(g).some((d) => d.carrying), 60);
    const before = totalGoods(g);
    const loaded = Game.load(g.save());
    expect(loaded.donkeys.size).toBe(0);
    expect(totalGoods(loaded)).toEqual(before);
    expect(loaded.population).toBe(18);
  });
});
