// Isometric projection. World coords are tile units; tile (i, j) covers [i, i+1) x [j, j+1).
export const TW = 64;
export const TH = 32;

export function toIso(x: number, y: number) {
  return { x: ((x - y) * TW) / 2, y: ((x + y) * TH) / 2 };
}

export function fromIso(sx: number, sy: number) {
  const a = sx / (TW / 2);
  const b = sy / (TH / 2);
  return { x: (a + b) / 2, y: (b - a) / 2 };
}
