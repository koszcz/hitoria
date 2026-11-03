// Where you hear the work from, and how far left or right each work sound plays.
// On a computer you hear from the mouse pointer. On a phone, or with the pointer outside the
// window, you hear from the middle of the screen.
import { TW } from '../iso';
import { WORK_KINDS, nearness, type WorkKind, type WorkSource } from './work';

export interface ScreenPoint {
  x: number;
  y: number;
}

export class Ear {
  private pointer: ScreenPoint | null = null;

  // The pointer moved to this screen pixel. A touch has no pointer that stays on the screen.
  move(x: number, y: number, pointerType: string) {
    this.pointer = pointerType === 'touch' ? null : { x, y };
  }

  // The pointer left the window.
  leave() {
    this.pointer = null;
  }

  // Follows the pointer events of a window.
  watch(win: EventTarget) {
    win.addEventListener('pointermove', (e) => {
      const p = e as PointerEvent;
      this.move(p.clientX, p.clientY, p.pointerType);
    });
    // `mouseout` with nowhere to go means the pointer left the page.
    win.addEventListener('mouseout', (e) => {
      if (!(e as MouseEvent).relatedTarget) this.leave();
    });
  }

  // The screen pixel you hear from, on a screen this wide and high.
  point(width: number, height: number): ScreenPoint {
    return this.pointer ?? { x: width / 2, y: height / 2 };
  }
}

export interface PanView {
  x: number; // the point you hear from, in tile coordinates
  y: number;
  zoom: number; // the camera zoom
  halfWidth: number; // pixels from the point you hear from to the side of the screen
}

// How far left (-1) or right (1) each work sound plays. A sound made by several workers leans
// towards the louder, nearer ones.
export function workPan(sources: WorkSource[], v: PanView): Record<WorkKind, number> {
  const sum = { chop: 0, saw: 0, hammer: 0 };
  const weight = { chop: 0, saw: 0, hammer: 0 };
  for (const s of sources) {
    const w = nearness(s, v);
    if (w === 0) continue;
    // Pixels right of the ear on screen. The camera looks along the tiles' diagonal.
    const px = ((s.x - s.y - (v.x - v.y)) * TW * v.zoom) / 2;
    sum[s.kind] += w * Math.min(1, Math.max(-1, px / v.halfWidth));
    weight[s.kind] += w;
  }
  const out = { chop: 0, saw: 0, hammer: 0 };
  for (const k of WORK_KINDS) if (weight[k] > 0) out[k] = sum[k] / weight[k];
  return out;
}
