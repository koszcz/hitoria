// The goods chart's shape: where each good's line runs, and how tall the chart is.
import { describe, expect, test } from 'bun:test';
import { bag, type StockSample } from '../game';
import { chartLines, roundTop } from './lines';

const note = (t: number, plank: number, fish = 0): StockSample => ({ t, stock: bag({ plank, fish }) });

describe('the top of the chart', () => {
  test('is never below 10', () => {
    expect(roundTop(0)).toBe(10);
    expect(roundTop(7)).toBe(10);
  });
  test('rounds up to 1, 2 or 5 times a power of ten', () => {
    expect(roundTop(11)).toBe(20);
    expect(roundTop(24)).toBe(50);
    expect(roundTop(50)).toBe(50);
    expect(roundTop(51)).toBe(100);
    expect(roundTop(130)).toBe(200);
    expect(roundTop(999)).toBe(1000);
  });
});

describe('the lines', () => {
  test('no notes draw no lines', () => {
    expect(chartLines([], ['plank'], 100, 50)).toEqual({ lines: [], top: 10, span: 0 });
  });

  test('run from the oldest note on the left to the latest on the right', () => {
    const c = chartLines([note(0, 0), note(10, 10), note(20, 20)], ['plank'], 100, 50);
    expect(c.top).toBe(20);
    expect(c.span).toBe(20);
    expect(c.lines).toEqual([{ good: 'plank', points: '0,50 50,25 100,0', now: 20 }]);
  });

  test('share one scale, set by the largest amount of any good shown', () => {
    const c = chartLines([note(0, 4, 40), note(10, 4, 40)], ['plank', 'fish'], 100, 50);
    expect(c.top).toBe(50);
    expect(c.lines.map((l) => l.points)).toEqual(['0,46 100,46', '0,10 100,10']);
  });

  test('ignore goods that are not shown when setting the scale', () => {
    expect(chartLines([note(0, 4, 400)], ['plank'], 100, 50).top).toBe(10);
  });

  test('a single note draws a flat line across the chart', () => {
    const c = chartLines([note(5, 5)], ['plank'], 100, 50);
    expect(c.lines[0].points).toBe('0,25 100,25');
    expect(c.span).toBe(0);
  });
});
