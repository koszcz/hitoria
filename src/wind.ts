// The wind that bends trees, grass and grain. It blows toward the right of the screen.
// A steady breeze rises and falls slowly, and gusts roll across the island as waves.

export const WIND_DIR = { x: Math.SQRT1_2, y: -Math.SQRT1_2 }; // on the map: toward +x, -y

// How hard the wind pushes at tile (x, y) at time t, in seconds. Always between 0 and 1.
export function wind(x: number, y: number, t: number) {
  const breeze = 0.5 + 0.5 * Math.sin(t * 0.21) * Math.sin(t * 0.077 + 1);
  const along = x * WIND_DIR.x + y * WIND_DIR.y;
  const across = x * WIND_DIR.y - y * WIND_DIR.x;
  // A gust is a band across the wind that travels with it, wavy so it is not a straight line.
  const wave = Math.sin(along * 0.22 - t * 1.1 + Math.sin(across * 0.15 + t * 0.1) * 1.5);
  const gust = Math.max(0, wave) ** 4;
  return Math.min(1, 0.25 + 0.25 * breeze + 0.5 * gust);
}

// A quick back-and-forth on top of the push, so leaves never sit still. Between -1 and 1.
export function flutter(x: number, y: number, t: number, speed = 1) {
  return Math.sin(t * 2.3 * speed + x * 1.7 + y * 2.9) * 0.6 + Math.sin(t * 3.7 * speed + x * 0.9 - y * 1.3) * 0.4;
}
