import { describe, expect, test } from 'bun:test';
import { cos, hypot, sin } from './exact';

describe('exact math', () => {
  test('sin and cos stay within a hair of Math.sin and Math.cos', () => {
    for (let x = -200; x <= 200; x += 0.0137) {
      expect(Math.abs(sin(x) - Math.sin(x))).toBeLessThan(1e-14);
      expect(Math.abs(cos(x) - Math.cos(x))).toBeLessThan(1e-14);
    }
  });

  test('sin and cos are exact at zero', () => {
    expect(sin(0)).toBe(0);
    expect(cos(0)).toBe(1);
  });

  // These values come from this file's own code, which uses only + - * / and Math.round. Every
  // machine gives them bit for bit, so a change here means the maps of every seed changed.
  test('gives the same bits on every machine', () => {
    expect(sin(1)).toBe(0.8414709848078965);
    expect(cos(1)).toBe(0.5403023058681398);
    expect(sin(100)).toBe(-0.5063656411097588);
    expect(cos(-2.5)).toBe(-0.8011436155469337);
  });

  test('hypot gives the length of a vector', () => {
    expect(hypot(3, 4)).toBe(5);
    expect(hypot(-5, 12)).toBe(13);
    expect(hypot(0, 0)).toBe(0);
  });
});
