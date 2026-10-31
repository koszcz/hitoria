import type { BType } from './game';

// The game's look in one place: light, land, water, trees and roof colours.
// Earthy and muted, like the classic Settlers games, with soft light and speckled ground.

export const ART = {
  sky: '#8a9c94',
  hemiSky: '#e8dcc0', // light from the sky
  hemiGround: '#5a4a30', // light bounced off the ground
  hemi: 1.65,
  sun: '#ffd49a',
  sunPower: 1.9,
  exposure: 1,
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
  tree: { hue: 0.1, range: 0.12, s: 0.3, l: 0.74 }, // per-tree tint
  flag: '#c8a030',
  roofs: {
    hq: '#8a3e2a', woodcutter: '#9a8650', forester: '#a08a52', quarry: '#6a645c', sawmill: '#8a4a32', lookout: '#6a5a48',
    storehouse: '#7a5232', fisher: '#9a8654', farm: '#b0944e', mill: '#7a4a2a', bakery: '#8a3e2a', mine: '#5a524a', house: '#9a4a32',
  } as Record<BType, string>,
};
