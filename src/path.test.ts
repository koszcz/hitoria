import { describe, expect, test } from 'bun:test';
import { findPath, P } from './path';

const open = () => true;
const walls = (...blocked: P[]) => (x: number, y: number) => !blocked.some((b) => b.x === x && b.y === y);

describe('findPath', () => {
  test('returns an empty path when start and goal are the same', () => {
    expect(findPath(5, 5, 5, 5, open)).toEqual([]);
  });

  test('walks straight along a row, excluding the start tile', () => {
    expect(findPath(0, 0, 3, 0, open)).toEqual([{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }]);
  });

  test('moves diagonally when that is shorter', () => {
    expect(findPath(0, 0, 3, 3, open)).toEqual([{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }]);
  });

  test('can always enter the goal tile, even if it is blocked', () => {
    const p = findPath(0, 0, 2, 0, walls({ x: 2, y: 0 }));
    expect(p?.at(-1)).toEqual({ x: 2, y: 0 });
  });

  test('never cuts the corner of a blocked tile', () => {
    // Going from (0,0) to (1,1) diagonally would clip the blocked tile (1,0).
    const p = findPath(0, 0, 1, 1, walls({ x: 1, y: 0 }))!;
    expect(p).toEqual([{ x: 0, y: 1 }, { x: 1, y: 1 }]);
  });

  test('routes around a wall', () => {
    const wall = [0, 1, 2, 3].map((y) => ({ x: 2, y }));
    const p = findPath(0, 0, 4, 0, walls(...wall))!;
    expect(p.at(-1)).toEqual({ x: 4, y: 0 });
    for (const step of p) expect(wall).not.toContainEqual(step);
  });

  test('returns null when the goal is sealed off', () => {
    const ring: P[] = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) ring.push({ x: 10 + dx, y: 10 + dy });
    expect(findPath(0, 0, 10, 10, walls(...ring))).toBeNull();
  });

  test('gives up after expanding too many tiles', () => {
    expect(findPath(0, 0, 60, 60, (x) => x < 50, 50)).toBeNull();
  });

  test('stays inside the map', () => {
    const p = findPath(0, 0, 0, 5, walls({ x: 0, y: 2 }))!;
    for (const step of p) expect(step.x).toBeGreaterThanOrEqual(0);
  });

  test('prefers cheaper tiles, such as roads, when given a cost', () => {
    // A road along y = 1 makes the detour cheaper than the straight line on y = 0.
    const cost = (_x: number, y: number) => (y === 1 ? 0.6 : 1);
    const p = findPath(0, 0, 10, 0, open, 6000, cost)!;
    expect(p.filter((s) => s.y === 1).length).toBeGreaterThan(5);
  });
});
