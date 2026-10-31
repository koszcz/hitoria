// The light for each time of day: night, dawn, midday, dusk and back to night.
// The clock is a day fraction: 0 is midnight, 0.25 dawn, 0.5 midday and 0.75 dusk.
import * as THREE from 'three';
import { ART } from '../art';

export type Light = {
  sky: THREE.Color; // background colour
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemi: number;
  sun: THREE.Color; // the sun by day, the moon by night
  sunPower: number;
  dir: THREE.Vector3; // unit vector toward the sun or moon
};

type Look = { sky: string; hemiSky: string; hemiGround: string; hemi: number; sun: string; sunPower: number };

const DAY: Look = ART;
// Day fraction where each look is at its fullest. Between two keys the light blends smoothly.
const KEYS: [number, Look][] = [
  [0, ART.night],
  [0.21, ART.night],
  [0.27, ART.dusk],
  [0.34, DAY],
  [0.66, DAY],
  [0.73, ART.dusk],
  [0.79, ART.night],
  [1, ART.night],
];

export const DAY_LENGTH = 480; // seconds of game time in one day
const START = 0.3; // a new game starts in the early morning

// Day fraction for a game time, so pausing stops the clock and a save keeps its time of day.
export function clock(time: number) {
  const f = time / DAY_LENGTH + START;
  return f - Math.floor(f);
}

// At midday the sun is upper left on screen, so shadows fall to the right.
const NOON_DIR = new THREE.Vector3(-0.9, 1.3, 0.35);
const NOON_AROUND = Math.atan2(NOON_DIR.z, NOON_DIR.x);
const NOON_UP = Math.atan2(NOON_DIR.y, Math.hypot(NOON_DIR.x, NOON_DIR.z));
const SWING = (45 * Math.PI) / 180; // how far the sun turns from midday to dusk
const LOW = (10 * Math.PI) / 180; // height above the horizon at dawn and dusk

// The sun rises on one side and sets on the other. At night the moon swings back the same way.
function lightDir(f: number) {
  const a = 2 * Math.PI * (f - 0.5);
  const around = NOON_AROUND + SWING * Math.sin(a);
  const up = LOW + (NOON_UP - LOW) * Math.cos(a) ** 2;
  return new THREE.Vector3(Math.cos(up) * Math.cos(around), Math.sin(up), Math.cos(up) * Math.sin(around));
}

export function daylightAt(day: number): Light {
  const f = day - Math.floor(day);
  let i = 0;
  while (KEYS[i + 1][0] < f) i++;
  const [f0, a] = KEYS[i], [f1, b] = KEYS[i + 1];
  const t = smooth((f - f0) / (f1 - f0));
  const colour = (k: 'sky' | 'hemiSky' | 'hemiGround' | 'sun') => new THREE.Color(a[k]).lerp(new THREE.Color(b[k]), t);
  return {
    sky: colour('sky'),
    hemiSky: colour('hemiSky'),
    hemiGround: colour('hemiGround'),
    hemi: a.hemi + (b.hemi - a.hemi) * t,
    sun: colour('sun'),
    sunPower: a.sunPower + (b.sunPower - a.sunPower) * t,
    dir: lightDir(f),
  };
}

const smooth = (t: number) => t * t * (3 - 2 * t);
