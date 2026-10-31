import { describe, expect, test } from 'bun:test';
import { groundHeight } from './elevation';
import { ART } from '../art';

// Elevation values from the map, from deep sea to the highest peak, 0.001 apart.
const LEVELS = Array.from({ length: 1101 }, (_, i) => i / 1000);

describe('ground height', () => {
  test('rises as the land gets higher', () => {
    for (let i = 1; i < LEVELS.length; i++) expect(groundHeight(LEVELS[i])).toBeGreaterThan(groundHeight(LEVELS[i - 1]));
  });

  test('has no step at the edge of a mountain', () => {
    expect(groundHeight(0.7001) - groundHeight(0.6999)).toBeLessThan(0.01);
  });

  test('has no step anywhere on land', () => {
    for (let i = 300; i < LEVELS.length - 1; i++)
      expect(groundHeight(LEVELS[i + 1]) - groundHeight(LEVELS[i])).toBeLessThan(0.03);
  });

  test('keeps building land almost flat', () => {
    expect(groundHeight(0.66) - groundHeight(0.4)).toBeLessThan(0.4);
  });

  test('a mountain of the size the start mountain has reaches the snow line', () => {
    expect(groundHeight(0.8)).toBeGreaterThan(ART.snowLine);
  });

  test('the highest peaks stand tall', () => {
    expect(groundHeight(1)).toBeGreaterThan(5);
  });
});
