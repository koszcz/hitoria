// The game's look in one place: light, land, water and trees. Building colours are in render/looks.ts.
// Earthy and muted, like the classic Settlers games, with soft light and speckled ground.

export const ART = {
  sky: '#8a9c94',
  hemiSky: '#e8dcc0', // light from the sky
  hemiGround: '#5a4a30', // light bounced off the ground
  hemi: 1.65,
  sun: '#ffd49a',
  sunPower: 1.9,
  exposure: 1,
  // The light at dawn and dusk, and at night. The values above are the light at midday.
  dusk: { sky: '#b08a78', hemiSky: '#e0b090', hemiGround: '#4a3428', hemi: 1.2, sun: '#ff9858', sunPower: 1.3 },
  night: { sky: '#2c3648', hemiSky: '#7a8cb8', hemiGround: '#2c2c38', hemi: 1.05, sun: '#a4b8e4', sunPower: 0.7 },
  // Applied to every model colour: shift saturation and lightness, then blend toward a warm tint.
  grade: { h: 0, s: -0.14, l: 0.03, tint: '#b8a478', k: 0.18 },
  grass: { h: -0.04, s: -0.2, l: 0.03 }, // shift from the map's own grass colour
  grain: 2.2, // how strong the speckle on ground and roads is
  rock: '#7a6e5a',
  snow: '#ece6d8',
  snowLine: 2.4,
  sand: '#c2ac78',
  water: '#3f7470',
  waterOpacity: 0.8,
  deep: '#1f3a38', // sea floor colour far from shore
  roads: ['#7e6a48', '#c4ae80'] as const, // verge, then track
  path: '#a08a5e', // grass worn down to dirt by footsteps
  tree: { hue: 0.1, range: 0.12, s: 0.3, l: 0.74 }, // per-tree tint
  flag: '#c8a030',
};
