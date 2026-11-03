// Landing by the ore: from map version 14, each island's mountains sit along its far shore, away
// from the sea lane. So the ship lands on a shore with coal and iron close by, and mines still fit
// in the land around the new harbour.
import { describe, expect, test } from 'bun:test';
import { harbourGame } from './test-helpers';
import { landingSpot } from './voyage';
import { nearOre } from './land';
import { LANDING_LAND } from './homes';

describe('landing by the ore', () => {
  for (const seed of [1, 2, 3, 4, 5, 6])
    for (const isle of ['other', 'far'] as const)
      test(`seed ${seed}: the ship to the ${isle === 'other' ? 'second' : 'far'} island lands with ore close by`, () => {
        const { g, h } = harbourGame(seed);
        const { land } = landingSpot(g, h, isle)!;
        expect(g.world.isleAt(land.x, land.y)).toBe(isle);
        // Ore this close leaves room for a mine inside the harbour's land.
        expect(nearOre(g, land.x, land.y, LANDING_LAND - 2)).toBe(true);
      });
});
