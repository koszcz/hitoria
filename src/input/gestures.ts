// Turns pointer presses on the map into pans, pinch zooms and taps. It knows nothing about the
// page, so the tests can drive it with plain numbers.

export type Cam = { x: number; y: number; zoom: number };
export type View = { cam: Cam; w: number; h: number };
export type Tap = { x: number; y: number; button: number; touch: boolean };

export const MIN_ZOOM = 0.45;
export const MAX_ZOOM = 2.6;
// How far a press may wander, in pixels, and still count as a tap. Fingers wobble more than mice.
const SLOP = { mouse: 5, touch: 10 };

// Zoom by `factor`, keeping the map point under the screen point (sx, sy) where it is.
export function zoomAt(v: View, sx: number, sy: number, factor: number) {
  const cam = v.cam;
  const bx = (sx - v.w / 2) / cam.zoom, by = (sy - v.h / 2) / cam.zoom;
  cam.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, cam.zoom * factor));
  cam.x += bx - (sx - v.w / 2) / cam.zoom;
  cam.y += by - (sy - v.h / 2) / cam.zoom;
}

type Pt = { x: number; y: number };
type Press = { x: number; y: number; cx: number; cy: number; button: number; touch: boolean };

export class Gestures {
  private pts = new Map<number, Pt>();
  private press: Press | null = null;
  private moved = false;
  private pinch: { dist: number; mx: number; my: number } | null = null;

  constructor(private v: View) {}

  down(id: number, x: number, y: number, button = 0, touch = false) {
    this.pts.set(id, { x, y });
    if (this.pts.size === 1) {
      this.press = { x, y, cx: this.v.cam.x, cy: this.v.cam.y, button, touch };
      this.moved = false;
    } else {
      this.moved = true; // a second finger turns the tap into a pinch
      this.pinch = this.fingers();
    }
  }

  move(id: number, x: number, y: number) {
    if (!this.pts.has(id)) return;
    this.pts.set(id, { x, y });
    const cam = this.v.cam;
    if (this.pinch) {
      const now = this.fingers();
      // Zoom around where the fingers were, then follow them to where they are now.
      zoomAt(this.v, this.pinch.mx, this.pinch.my, now.dist / this.pinch.dist);
      cam.x -= (now.mx - this.pinch.mx) / cam.zoom;
      cam.y -= (now.my - this.pinch.my) / cam.zoom;
      this.pinch = now;
      return;
    }
    const p = this.press;
    if (!p) return;
    const dx = x - p.x, dy = y - p.y;
    if (Math.hypot(dx, dy) > SLOP[p.touch ? 'touch' : 'mouse']) this.moved = true;
    if (!this.moved) return;
    cam.x = p.cx - dx / cam.zoom;
    cam.y = p.cy - dy / cam.zoom;
  }

  // Lift a pointer. Returns the tap, if the press was one.
  up(id: number): Tap | null {
    if (!this.pts.delete(id)) return null;
    if (this.pts.size >= 2) {
      this.pinch = this.fingers();
      return null;
    }
    if (this.pts.size === 1) {
      // One finger stays down after a pinch: it carries on panning from where it is.
      const [p] = this.pts.values();
      this.press = { x: p.x, y: p.y, cx: this.v.cam.x, cy: this.v.cam.y, button: 0, touch: true };
      this.pinch = null;
      return null;
    }
    const p = this.press;
    this.press = this.pinch = null;
    return p && !this.moved ? { x: p.x, y: p.y, button: p.button, touch: p.touch } : null;
  }

  // The browser took the pointer away, for example for a system gesture. Never a tap.
  cancel(id: number) {
    this.moved = true;
    this.up(id);
  }

  private fingers() {
    const [a, b] = this.pts.values();
    return { dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  }
}
