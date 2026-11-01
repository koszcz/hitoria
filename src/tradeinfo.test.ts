// The trade ship's part of a harbour's panel. While the ship is tied up, the panel shows the trade
// in a column of its own, so the whole panel fits on the screen.
import { describe, expect, test } from 'bun:test';
import { tradeOpen, tradeRows } from './tradeinfo';
import { TRADE_EVERY } from './game/trade';
import { harbourGame, runUntil } from './game/test-helpers';

describe('tradeOpen', () => {
  test('is true only while the trade ship is tied up at the harbour', () => {
    const { g, h } = harbourGame(1);
    expect(tradeOpen(g, h)).toBe(false);
    runUntil(g, () => g.trader?.leg === 'docked', TRADE_EVERY + 200);
    expect(tradeOpen(g, h)).toBe(true);
    expect(tradeRows(g, h, { give: null, get: null })).toContain('data-act="get"');
  });
});
