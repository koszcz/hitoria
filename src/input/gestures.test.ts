import { describe, expect, test } from 'bun:test';
import { Gestures, MAX_ZOOM, MIN_ZOOM, zoomAt, type View } from './gestures';

const view = (): View => ({ cam: { x: 100, y: 50, zoom: 1 }, w: 400, h: 800 });

// The map point under a screen point, in the camera's pan space.
const under = (v: View, sx: number, sy: number) => ({
  x: v.cam.x + (sx - v.w / 2) / v.cam.zoom,
  y: v.cam.y + (sy - v.h / 2) / v.cam.zoom,
});

describe('taps', () => {
  test('a press that stays put is a tap', () => {
    const g = new Gestures(view());
    g.down(1, 10, 20, 0, true);
    g.move(1, 15, 24);
    expect(g.up(1)).toEqual({ x: 10, y: 20, button: 0, touch: true });
  });

  test('the mouse button comes through, so right-click can cancel', () => {
    const g = new Gestures(view());
    g.down(1, 10, 20, 2);
    expect(g.up(1)?.button).toBe(2);
  });

  test('a mouse that moves more than a few pixels drags instead', () => {
    const g = new Gestures(view());
    g.down(1, 10, 20);
    g.move(1, 17, 20);
    expect(g.up(1)).toBeNull();
  });

  test('a cancelled pointer is never a tap', () => {
    const g = new Gestures(view());
    g.down(1, 10, 20, 0, true);
    g.cancel(1);
    expect(g.up(1)).toBeNull();
  });

  test('lifting an unknown pointer does nothing', () => {
    expect(new Gestures(view()).up(9)).toBeNull();
  });
});

describe('panning', () => {
  test('dragging moves the map with the finger', () => {
    const v = view();
    const g = new Gestures(v);
    const before = under(v, 200, 400);
    g.down(1, 200, 400, 0, true);
    g.move(1, 260, 370);
    expect(under(v, 260, 370)).toEqual(before);
  });

  test('panning respects the zoom', () => {
    const v = view();
    v.cam.zoom = 2;
    const g = new Gestures(v);
    g.down(1, 0, 0);
    g.move(1, 40, 0);
    expect(v.cam.x).toBe(80);
  });
});

describe('pinch zoom', () => {
  test('spreading two fingers zooms in around them', () => {
    const v = view();
    const g = new Gestures(v);
    g.down(1, 150, 400, 0, true);
    g.down(2, 250, 400, 0, true);
    const mid = under(v, 200, 400);
    g.move(1, 125, 400);
    g.move(2, 275, 400);
    expect(v.cam.zoom).toBeCloseTo(1.5);
    const after = under(v, 200, 400);
    expect(after.x).toBeCloseTo(mid.x);
    expect(after.y).toBeCloseTo(mid.y);
  });

  test('moving both fingers together pans', () => {
    const v = view();
    const g = new Gestures(v);
    g.down(1, 150, 400, 0, true);
    g.down(2, 250, 400, 0, true);
    const mid = under(v, 200, 400);
    g.move(1, 150, 450);
    g.move(2, 250, 450);
    expect(v.cam.zoom).toBeCloseTo(1);
    const after = under(v, 200, 450);
    expect(after.x).toBeCloseTo(mid.x);
    expect(after.y).toBeCloseTo(mid.y);
  });

  test('a pinch never ends in a tap, even with one finger left', () => {
    const g = new Gestures(view());
    g.down(1, 150, 400, 0, true);
    g.down(2, 250, 400, 0, true);
    expect(g.up(2)).toBeNull();
    expect(g.up(1)).toBeNull();
  });

  test('the finger left after a pinch keeps panning', () => {
    const v = view();
    const g = new Gestures(v);
    g.down(1, 150, 400, 0, true);
    g.down(2, 250, 400, 0, true);
    g.up(2);
    const before = under(v, 150, 400);
    g.move(1, 180, 420);
    expect(under(v, 180, 420)).toEqual(before);
  });
});

describe('zoomAt', () => {
  test('keeps the point under the cursor in place', () => {
    const v = view();
    const before = under(v, 50, 700);
    zoomAt(v, 50, 700, 1.7);
    const after = under(v, 50, 700);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  test('stays within the zoom limits', () => {
    const v = view();
    zoomAt(v, 0, 0, 100);
    expect(v.cam.zoom).toBe(MAX_ZOOM);
    zoomAt(v, 0, 0, 0.001);
    expect(v.cam.zoom).toBe(MIN_ZOOM);
  });
});
