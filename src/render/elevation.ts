// How high the ground stands for a map elevation. Land is almost flat, then it bends smoothly
// upward into foothills just below the mountain line, and rises steeply into peaks.

// Where the foothills start, where they reach full steepness, and how steep the peaks are.
const FOOT = 0.62;
const FULL = 0.78;
const STEEP = 24;

export function groundHeight(h: number) {
  if (h < 0.3) return (h - 0.3) * 5;
  const flat = (h - 0.3) * 1.1;
  if (h <= FOOT) return flat;
  const width = FULL - FOOT;
  // The steepness grows along a smoothstep curve, so the slope never jumps.
  const t = Math.min(1, (h - FOOT) / width);
  return flat + STEEP * (width * (t * t * t - (t * t * t * t) / 2) + Math.max(0, h - FULL));
}
