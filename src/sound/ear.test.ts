import { describe, expect, test } from 'bun:test';
import { Ear, workPan } from './ear';
import type { WorkSource } from './work';

describe('Ear', () => {
  test('hears from the middle of the screen before the pointer moves', () => {
    expect(new Ear().point(800, 600)).toEqual({ x: 400, y: 300 });
  });

  test('hears from the mouse pointer', () => {
    const ear = new Ear();
    ear.move(120, 80, 'mouse');
    expect(ear.point(800, 600)).toEqual({ x: 120, y: 80 });
  });

  test('a pen that hovers counts as a pointer', () => {
    const ear = new Ear();
    ear.move(50, 60, 'pen');
    expect(ear.point(800, 600)).toEqual({ x: 50, y: 60 });
  });

  test('a touch hears from the middle of the screen', () => {
    const ear = new Ear();
    ear.move(120, 80, 'mouse');
    ear.move(30, 40, 'touch');
    expect(ear.point(800, 600)).toEqual({ x: 400, y: 300 });
  });

  test('when the pointer leaves the window, it hears from the middle again', () => {
    const ear = new Ear();
    ear.move(120, 80, 'mouse');
    ear.leave();
    expect(ear.point(800, 600)).toEqual({ x: 400, y: 300 });
  });

  test('follows the pointer events of the window it watches', () => {
    const win = new EventTarget();
    const ear = new Ear();
    ear.watch(win);
    win.dispatchEvent(Object.assign(new Event('pointermove'), { clientX: 10, clientY: 20, pointerType: 'mouse' }));
    expect(ear.point(800, 600)).toEqual({ x: 10, y: 20 });
    // Moving onto another element inside the page keeps the pointer.
    win.dispatchEvent(Object.assign(new Event('mouseout'), { relatedTarget: {} }));
    expect(ear.point(800, 600)).toEqual({ x: 10, y: 20 });
    win.dispatchEvent(Object.assign(new Event('mouseout'), { relatedTarget: null }));
    expect(ear.point(800, 600)).toEqual({ x: 400, y: 300 });
  });
});

describe('workPan', () => {
  // The ear at tile 10,10, at zoom 1, with 320 pixels from the ear to the screen's side.
  const view = { x: 10, y: 10, zoom: 1, halfWidth: 320 };
  const at = (kind: WorkSource['kind'], x: number, y: number): WorkSource => ({ kind, x, y });

  test('with no work going on, every sound stays in the middle', () => {
    expect(workPan([], view)).toEqual({ chop: 0, saw: 0, hammer: 0 });
  });

  test('work right of the ear on screen pans right, and work to the left pans left', () => {
    // One tile along x is 32 pixels right on screen. One tile along y is 32 pixels left.
    expect(workPan([at('chop', 15, 10)], view).chop).toBe(0.5);
    expect(workPan([at('saw', 10, 15)], view).saw).toBe(-0.5);
  });

  test('work straight above or below the ear stays in the middle', () => {
    expect(workPan([at('hammer', 13, 13)], view).hammer).toBe(0);
  });

  test('work at or past the side of the screen pans fully to that side', () => {
    expect(workPan([at('chop', 20, 10)], view).chop).toBe(1);
    expect(workPan([at('chop', 10, 22)], view).chop).toBe(-1);
  });

  test('zooming in moves work further to the side', () => {
    expect(workPan([at('chop', 15, 10)], { ...view, zoom: 1.5 }).chop).toBe(0.75);
  });

  test('several workers pan towards the nearer, louder ones', () => {
    const p = workPan([at('chop', 12, 10), at('chop', 10, 20)], view).chop;
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(0.2);
  });

  test('work too far away to hear does not pull the sound', () => {
    expect(workPan([at('chop', 15, 10), at('chop', 10, 40)], view).chop).toBe(0.5);
  });

  test('each sound pans on its own', () => {
    expect(workPan([at('chop', 15, 10), at('hammer', 10, 15)], view)).toEqual({ chop: 0.5, saw: 0, hammer: -0.5 });
  });
});
