import { describe, expect, test } from 'bun:test';
import type { Game } from '.';
import { flatGame, placeLinked, run, runUntil } from './test-helpers';
import { NO_TOOL } from './tools';

// A finished building with a road to the HQ, still waiting for its worker.
function finished(g: Game, type: Parameters<Game['place']>[0], dx: number, dy: number) {
  const b = placeLinked(g, type, g.hq.x + dx, g.hq.y + dy);
  Object.assign(b, { built: true, progress: 1 });
  return b;
}

describe('tools for the toolmaker first', () => {
  test('a Toolmaker waiting for a tool gets the next free tool before huts placed earlier', () => {
    const g = flatGame();
    g.hq.stock.tool = 0;
    const wood = finished(g, 'woodcutter', 4, 3);
    const quarry = finished(g, 'quarry', -4, 3);
    const maker = finished(g, 'toolmaker', 4, -3);
    run(g, 10);
    expect([wood.status, quarry.status, maker.status]).toEqual([NO_TOOL, NO_TOOL, NO_TOOL]);
    g.hq.stock.tool = 1;
    runUntil(g, () => !!maker.tooled, 60);
    expect(maker.tooled).toBe(true);
    expect(wood.worker).toBe(0);
    expect(quarry.worker).toBe(0);
    expect(wood.status).toBe(NO_TOOL);
    expect(quarry.status).toBe(NO_TOOL);
    expect(g.hq.stock.tool).toBe(0);
  });

  test('with 2 free tools, the Toolmaker takes one and the first hut takes the other', () => {
    const g = flatGame();
    g.hq.stock.tool = 2;
    const wood = finished(g, 'woodcutter', 4, 3);
    const quarry = finished(g, 'quarry', -4, 3);
    const maker = finished(g, 'toolmaker', 4, -3);
    runUntil(g, () => !!maker.tooled && !!wood.tooled, 60);
    expect(maker.tooled).toBe(true);
    expect(wood.tooled).toBe(true);
    expect(quarry.worker).toBe(0);
    expect(quarry.status).toBe(NO_TOOL);
  });
});
