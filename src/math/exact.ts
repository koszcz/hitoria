// Sine, cosine and vector length that give the same bits on every machine. Math.sin, Math.cos
// and Math.hypot may differ in the last digit between browsers and operating systems, which
// changes how a seed's map comes out. These use only + - * /, Math.round and Math.sqrt, which
// every machine computes the same way. The polynomials come from fdlibm.

// π/2 split into a part with a short mantissa and the rest, so x - n·π/2 loses no digits.
const PIO2_HI = 1.57079632673412561417e0;
const PIO2_LO = 6.07710050650619224932e-11;
const TWO_OVER_PI = 6.36619772367581382433e-1;

// sin(x) for |x| ≤ π/4.
function sinNear(x: number) {
  const z = x * x, v = z * x;
  const r = 8.33333333332248946124e-3 + z * (-1.98412698298579493134e-4 + z * (2.75573137070700676789e-6 + z * (-2.50507602534068634195e-8 + z * 1.58969099521155010221e-10)));
  return x + v * (-1.66666666666666324348e-1 + z * r);
}

// cos(x) for |x| ≤ π/4.
function cosNear(x: number) {
  const z = x * x;
  const r = z * (4.16666666666666019037e-2 + z * (-1.38888888888741095749e-3 + z * (2.48015872894767294178e-5 + z * (-2.75573143513906633035e-7 + z * (2.08757232129817482790e-9 + z * -1.13596475577881948265e-11)))));
  const hz = 0.5 * z, w = 1 - hz;
  return w + ((1 - w - hz) + z * r);
}

// Which quarter turn x is in, from 0 to 3, and how far x is from its middle.
function quarter(x: number): [number, number] {
  const n = Math.round(x * TWO_OVER_PI);
  return [((n % 4) + 4) % 4, x - n * PIO2_HI - n * PIO2_LO];
}

export function sin(x: number) {
  const [q, r] = quarter(x);
  return q === 0 ? sinNear(r) : q === 1 ? cosNear(r) : q === 2 ? -sinNear(r) : -cosNear(r);
}

export function cos(x: number) {
  const [q, r] = quarter(x);
  return q === 0 ? cosNear(r) : q === 1 ? -sinNear(r) : q === 2 ? -cosNear(r) : sinNear(r);
}

export function hypot(x: number, y: number) {
  return Math.sqrt(x * x + y * y);
}
