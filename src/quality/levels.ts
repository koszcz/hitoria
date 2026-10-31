// The graphics levels a player can pick, what each one draws, and the level a new device starts on.

export type Level = 'low' | 'medium' | 'high';
export const LEVELS: Level[] = ['low', 'medium', 'high'];

export interface Graphics {
  maxPixelRatio: number; // sharp screens draw at most this many pixels per CSS pixel
  shadows: 'off' | 'hard' | 'soft';
  shadowSize: number; // shadow map width and height, in texels
}

export const GRAPHICS: Record<Level, Graphics> = {
  low: { maxPixelRatio: 1, shadows: 'off', shadowSize: 512 },
  medium: { maxPixelRatio: 1.5, shadows: 'hard', shadowSize: 1024 },
  high: { maxPixelRatio: 2, shadows: 'soft', shadowSize: 2048 },
};

export interface DeviceHints {
  touch: boolean; // a phone or tablet
  cores?: number; // navigator.hardwareConcurrency
  memory?: number; // navigator.deviceMemory, in GB (Chrome only)
}

// A guess from what the browser tells us. Playing then corrects it, see AutoQuality.
export function startLevel(d: DeviceHints): Level {
  if ((d.cores && d.cores <= 2) || (d.memory && d.memory <= 2)) return 'low';
  if (d.touch || (d.cores && d.cores <= 4) || (d.memory && d.memory <= 4)) return 'medium';
  return 'high';
}

export const lower = (l: Level): Level | null => LEVELS[LEVELS.indexOf(l) - 1] ?? null;
export const higher = (l: Level): Level | null => LEVELS[LEVELS.indexOf(l) + 1] ?? null;
