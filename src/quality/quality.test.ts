import { describe, expect, test } from 'bun:test';
import { AUTO, AutoQuality } from './auto';
import { GraphicsChoice, nextChoice } from './choice';
import { startLevel } from './levels';
import { GraphicsSetting } from './setting';

// Feeds frames of `ms` for `seconds`, and returns every level change in order.
function run(a: AutoQuality, ms: number, seconds: number) {
  const changes: string[] = [];
  for (let t = 0; t < seconds * 1000; t += ms) {
    const l = a.frame(ms);
    if (l) changes.push(l);
  }
  return changes;
}

describe('startLevel', () => {
  test('a desktop starts on high, a phone on medium, a weak device on low', () => {
    expect(startLevel({ touch: false, cores: 8, memory: 8 })).toBe('high');
    expect(startLevel({ touch: false })).toBe('high');
    expect(startLevel({ touch: true, cores: 8 })).toBe('medium');
    expect(startLevel({ touch: false, cores: 4 })).toBe('medium');
    expect(startLevel({ touch: true, memory: 2 })).toBe('low');
    expect(startLevel({ touch: true, cores: 2 })).toBe('low');
  });
});

describe('AutoQuality', () => {
  test('keeps the level while frames are fine', () => {
    expect(run(new AutoQuality('high'), 16, 120)).toEqual([]);
    expect(run(new AutoQuality('high'), 33, 120)).toEqual([]); // a phone held at 30 fps is fine
  });

  test('steps down one level at a time while the game runs slowly', () => {
    const a = new AutoQuality('high');
    expect(run(a, 60, 4)).toEqual([]); // waits for a full window, after settling
    expect(run(a, 60, 2)).toEqual(['medium']);
    expect(run(a, 60, 10)).toEqual(['low']);
    expect(run(a, 60, 30)).toEqual([]); // nothing lower to go to
  });

  test('a game stuck at 5 fps steps down too', () => {
    expect(run(new AutoQuality('high'), 200, 6)).toEqual(['medium']);
  });

  test('ignores a long hiccup, such as coming back to the tab', () => {
    const a = new AutoQuality('high');
    run(a, 16, 10);
    expect(a.frame(190)).toBeNull();
    for (let i = 0; i < 20; i++) expect(a.frame(AUTO.ignoreMs + 50)).toBeNull();
    expect(a.level).toBe('high');
  });

  test('a short slow moment inside a smooth window does not lower the level', () => {
    const a = new AutoQuality('high');
    run(a, 16, 5);
    for (let i = 0; i < 5; i++) a.frame(120);
    expect(run(a, 16, 10)).toEqual([]);
  });

  test('steps back up after smooth play, but never to a level that ran slowly', () => {
    const a = new AutoQuality('low');
    expect(run(a, 10, AUTO.upAfter + AUTO.window * 2 + AUTO.settle)).toEqual(['medium']);
    expect(run(a, 60, 6)).toEqual(['low']); // medium was too much after all
    expect(run(a, 10, 120)).toEqual([]); // so it stays on low
  });
});

describe('GraphicsChoice', () => {
  const store = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
  };

  test('is auto until the player picks a level, and remembers it', () => {
    const s = store();
    expect(new GraphicsChoice(s).choice).toBe('auto');
    new GraphicsChoice(s).choice = 'low';
    expect(new GraphicsChoice(s).choice).toBe('low');
  });

  test('remembers the level auto settled on', () => {
    const s = store();
    expect(new GraphicsChoice(s).lastAuto).toBeNull();
    new GraphicsChoice(s).lastAuto = 'medium';
    expect(new GraphicsChoice(s).lastAuto).toBe('medium');
  });

  test('ignores junk in storage, and works when storage is blocked', () => {
    const s = store();
    s.setItem('hitoria.graphics', 'ultra');
    expect(new GraphicsChoice(s).choice).toBe('auto');
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    const g = new GraphicsChoice(blocked);
    g.choice = 'high';
    expect(g.choice as string).toBe('auto');
  });

  test('the button cycles auto → low → medium → high → auto', () => {
    expect(['auto', 'low', 'medium', 'high'].map((c) => nextChoice(c as never))).toEqual(['low', 'medium', 'high', 'auto']);
  });
});

describe('GraphicsSetting', () => {
  const store = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
  };
  const slow = (g: GraphicsSetting) => {
    const out: (string | null)[] = [];
    for (let i = 0; i < 100; i++) out.push(g.frame(60)); // 6 s: one step down
    return out.filter(Boolean);
  };

  test('starts on auto, at the level that suits the device', () => {
    expect(new GraphicsSetting({ touch: true }, new GraphicsChoice(store())).level).toBe('medium');
    expect(new GraphicsSetting({ touch: false }, new GraphicsChoice(store())).level).toBe('high');
  });

  test('on auto, lowers the level when the game runs slowly, and remembers it for next time', () => {
    const s = store();
    const g = new GraphicsSetting({ touch: false }, new GraphicsChoice(s));
    expect(slow(g)).toEqual(['medium']);
    expect(g.level).toBe('medium');
    expect(new GraphicsSetting({ touch: false }, new GraphicsChoice(s)).level).toBe('medium');
  });

  test('a level the player picked is never changed', () => {
    const s = store();
    const g = new GraphicsSetting({ touch: false }, new GraphicsChoice(s));
    expect(g.cycle()).toBe('low');
    expect(g.cycle()).toBe('medium');
    expect(g.cycle()).toBe('high');
    expect(slow(g)).toEqual([]);
    expect(g.level).toBe('high');
    expect(new GraphicsSetting({ touch: false }, new GraphicsChoice(s)).choice).toBe('high');
  });

  test('going back to auto starts adjusting again', () => {
    const g = new GraphicsSetting({ touch: false }, new GraphicsChoice(store()));
    for (let i = 0; i < 4; i++) g.cycle();
    expect(g.choice).toBe('auto');
    expect(slow(g)).toEqual(['medium']);
  });
});
