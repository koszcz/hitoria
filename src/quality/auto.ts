// Watches how long frames take and moves the graphics level down when the game runs slowly, and
// back up when it has run smoothly for a while. A level that ran slowly is not tried again.
import { Level, higher, lower } from './levels';

export const AUTO = {
  window: 3, // seconds of frames averaged before deciding anything
  settle: 2, // seconds ignored after a change, while new shaders compile
  slowMs: 40, // an average frame slower than this (under 25 fps) lowers the level
  smoothMs: 20, // an average frame faster than this (over 50 fps) counts as smooth
  upAfter: 30, // seconds of smooth play before trying the next level up
  ignoreMs: 1000, // a frame this long is a hiccup, such as coming back to the tab
};

export class AutoQuality {
  private blocked = new Set<Level>();
  private settle = AUTO.settle;
  private time = 0;
  private sum = 0;
  private count = 0;
  private smooth = 0;

  constructor(public level: Level) {}

  // Record one frame. Returns the new level when it changes, otherwise null.
  frame(ms: number): Level | null {
    if (ms <= 0 || ms >= AUTO.ignoreMs) return null;
    const s = ms / 1000;
    if (this.settle > 0) {
      this.settle -= s;
      return null;
    }
    this.time += s;
    this.sum += ms;
    this.count++;
    if (this.time < AUTO.window) return null;
    const avg = this.sum / this.count;
    this.time = this.sum = this.count = 0;

    if (avg > AUTO.slowMs) {
      this.smooth = 0;
      const down = lower(this.level);
      if (!down) return null;
      this.blocked.add(this.level);
      return this.set(down);
    }
    this.smooth = avg < AUTO.smoothMs ? this.smooth + AUTO.window : 0;
    const up = higher(this.level);
    if (this.smooth >= AUTO.upAfter && up && !this.blocked.has(up)) return this.set(up);
    return null;
  }

  private set(l: Level) {
    this.level = l;
    this.smooth = 0;
    this.settle = AUTO.settle;
    return l;
  }
}
