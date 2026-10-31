// How loud each background sound should be, from what the camera looks at.
// Pure functions, so the rules can be tested without a browser.

// The share of tiles within `r` tiles of (cx, cy) that are water, from 0 to 1.
export function waterShare(isWater: (x: number, y: number) => boolean, cx: number, cy: number, r: number) {
  let all = 0, wet = 0;
  const x0 = Math.round(cx), y0 = Math.round(cy);
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      all++;
      if (isWater(x0 + dx, y0 + dy)) wet++;
    }
  return wet / all;
}

export interface View {
  water: number; // share of water near the camera, 0..1
  wind: number; // how hard the wind blows there, 0..1
  zoom: number; // the camera zoom; smaller is further away
  muted: boolean;
}

// Loudest each sound gets. Kept soft, so the sound sits behind the game.
const MAX_WIND = 0.3;
const MAX_WAVES = 0.45;
const NEAR_ZOOM = 1.3; // the zoom a new game starts at

// The volume of the wind and the waves, each from 0 to 1.
export function mix(v: View) {
  if (v.muted) return { wind: 0, waves: 0 };
  const distance = Math.min(1, Math.max(0.4, v.zoom / NEAR_ZOOM));
  return {
    wind: MAX_WIND * (0.3 + 0.7 * v.wind) * distance,
    waves: MAX_WAVES * Math.sqrt(v.water) * distance,
  };
}
