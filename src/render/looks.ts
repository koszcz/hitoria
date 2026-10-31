// Each building's body shape, wall colour and roof colour, so every building looks like itself.
import type { BType } from '../game';

export type Body = 'keep' | 'cabin' | 'steep' | 'stonehut' | 'shed' | 'tower' | 'barn' | 'stilts'
  | 'longhouse' | 'windmill' | 'brick' | 'mound' | 'cottage' | 'obelisk' | 'wellhead';

export interface Look {
  body: Body;
  wall: string;
  roof: string;
}

// Roofs are picked so that every two stay clearly apart (see looks.test.ts).
export const LOOKS: Record<BType, Look> = {
  hq: { body: 'keep', wall: '#dccaa6', roof: '#7a2424' },
  woodcutter: { body: 'cabin', wall: '#8a6038', roof: '#4a6a34' },
  forester: { body: 'steep', wall: '#cdb487', roof: '#8eaa3c' },
  quarry: { body: 'stonehut', wall: '#b9b4a8', roof: '#7c8088' },
  sawmill: { body: 'shed', wall: '#c49a6c', roof: '#a8702c' },
  lookout: { body: 'tower', wall: '#d2c4a4', roof: '#3a5a8e' },
  storehouse: { body: 'barn', wall: '#c8b48c', roof: '#76542e' },
  fisher: { body: 'stilts', wall: '#a49c8c', roof: '#2f7f86' },
  farm: { body: 'longhouse', wall: '#e0c99a', roof: '#d0aa4a' },
  well: { body: 'wellhead', wall: '#a8a294', roof: '#c86ab0' },
  mill: { body: 'windmill', wall: '#e6dcc4', roof: '#643258' },
  bakery: { body: 'brick', wall: '#b0624a', roof: '#c4503a' },
  mine: { body: 'mound', wall: '#9a948a', roof: '#2e3034' },
  house: { body: 'cottage', wall: '#e8d6b0', roof: '#b87a66' },
  monument: { body: 'obelisk', wall: '#d6d0c2', roof: '#f0e6a8' },
};

// How different two colours look to the eye: 0 for the same colour, about 100 from black to white.
// This is the CIE76 colour difference, measured in the Lab colour space.
export function colourGap(a: string, b: string) {
  const [l1, a1, b1] = lab(a), [l2, a2, b2] = lab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

function lab(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  // Linear RGB to XYZ, relative to the D65 white point.
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}
