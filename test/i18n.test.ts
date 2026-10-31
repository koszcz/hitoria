import { afterEach, describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { BDEFS, BUILDABLE, RECIPES, type BType } from '../src/game';
import { buildFacts, buildNow } from '../src/buildinfo';
import { T, buildingName, getLang, goodName, join, knownMessages, plural, setLang, startLang, tr } from '../src/i18n';
import { flatGame } from './helpers';

afterEach(() => setLang('en'));

describe('Polish plurals', () => {
  const pole = (n: number) => plural(n, 'pole', 'pola', 'pól');
  test('1, 2–4 and 5 or more take different forms', () => {
    expect([1, 2, 3, 4, 5, 11, 12, 14, 21, 22, 25, 104, 112].map(pole)).toEqual(
      ['pole', 'pola', 'pola', 'pola', 'pól', 'pól', 'pól', 'pól', 'pól', 'pola', 'pól', 'pola', 'pól'],
    );
    expect(pole(0)).toBe('pól');
  });

  test('lists join with the given word', () => {
    expect(join(['a'], 'i')).toBe('a');
    expect(join(['a', 'b', 'c'], 'lub')).toBe('a, b lub c');
  });
});

describe('game messages in Polish', () => {
  // Every fixed message the game shows a player: statuses, recipe states and refusals.
  const source = readFileSync(new URL('../src/game.ts', import.meta.url), 'utf8');
  const shown = new Set<string>();
  for (const line of source.split('\n')) {
    if (!/status|rest\(|return '|\? '|: '/.test(line) || /throw|^\s*\/\//.test(line)) continue;
    for (const m of line.matchAll(/'([A-Z][^']*[a-z][^']*)'/g)) shown.add(m[1]);
  }
  // Fixed toasts, such as "👶 A new settler was born".
  for (const m of source.matchAll(/toasts\.push\('([^']+)'\)/g)) shown.add(m[1]);
  for (const r of Object.values(RECIPES)) shown.add(r!.doing).add(r!.waiting);
  for (const t of Object.keys(BDEFS) as BType[]) [BDEFS[t].name, BDEFS[t].desc].forEach((s) => shown.delete(s));

  test('the scan finds the messages', () => {
    expect(shown.size).toBeGreaterThan(30);
    expect(shown.has('Waiting for a builder')).toBe(true);
    expect(shown.has('Outside your land')).toBe(true);
  });

  test('every message has a translation', () => {
    setLang('pl');
    const missing = [...shown].filter((m) => tr(m) === m);
    expect(missing).toEqual([]);
  });

  test('no translation is left over for a message the game no longer sends', () => {
    expect(knownMessages().filter((m) => !shown.has(m))).toEqual([]);
  });

  test('English is shown as it is', () => {
    expect(tr('Waiting for a builder')).toBe('Waiting for a builder');
    setLang('pl');
    expect(tr('Waiting for a builder')).toBe('Czeka na budowniczego');
    expect(tr('something new')).toBe('something new');
  });

  test('the "finished" toast names the building in Polish', () => {
    setLang('pl');
    const def = BDEFS.woodcutter;
    expect(tr(`${def.icon} ${def.name} finished`)).toBe(`${def.icon} Gotowe: Chata drwala`);
  });
});

describe('Polish names', () => {
  test('every building and good has a Polish name', () => {
    setLang('pl');
    for (const t of Object.keys(BDEFS) as BType[]) expect(buildingName(t)).not.toBe(BDEFS[t].name);
    expect(goodName('plank')).toBe('Deski');
    setLang('en');
    expect(buildingName('mill')).toBe('Mill');
    expect(goodName('plank')).toBe('Planks');
  });

  test('both languages have the same interface text', () => {
    const en = T();
    setLang('pl');
    expect(getLang()).toBe('pl');
    expect(Object.keys(T())).toEqual(Object.keys(en));
    expect(T().save).toBe('💾 Zapisz');
    expect(T().settlers(1, 0)).toContain('wolny');
    expect(T().settlers(3, 0)).toContain('wolni');
    expect(T().settlers(5, 0)).toContain('wolnych');
  });
});

describe('build card in Polish', () => {
  test('workshops show their speed with the right noun forms', () => {
    setLang('pl');
    expect(buildFacts('sawmill').makes).toBe('Zamienia 1 kłodę na 1 deskę co 5 s. To do 12 na minutę.');
    expect(buildFacts('mine').makes).toBe('Zamienia 1 bochenek chleba lub rybę na 2 kamienie co 8 s. To do 15 na minutę.');
  });

  test('gathering huts say where the goods come from', () => {
    setLang('pl');
    expect(buildFacts('woodcutter').makes).toBe('Przynosi kłody z dorosłych drzew.');
  });

  test('the verb agrees with the good', () => {
    setLang('pl');
    expect(buildFacts('woodcutter').worth).toContain('Kłody zasilają: Tartak.');
    expect(buildFacts('mill').worth).toContain('Mąka zasila: Piekarnia.');
    expect(buildFacts('sawmill').worth).toContain('Każdy budynek wymaga do budowy materiału: Deski.');
  });

  test('every building has Polish facts', () => {
    const english = new Map(BUILDABLE.map((t) => [t, buildFacts(t)]));
    setLang('pl');
    for (const t of BUILDABLE) {
      const f = buildFacts(t), e = english.get(t)!;
      expect(f.makes).not.toBe(e.makes);
      expect(f.needs.length).toBe(e.needs.length);
      expect(f.worth.length).toBe(e.worth.length);
      for (const n of f.needs) expect(e.needs).not.toContain(n);
    }
  });

  test('notes about your game', () => {
    setLang('pl');
    const g = flatGame();
    const { x, y } = g.hq;
    expect(buildNow(g, 'woodcutter').have).toBe('Nie masz jeszcze żadnego.');
    expect(buildNow(g, 'forester').warn).toContain('Nowe drzewa przydadzą się dopiero, gdy zetnie je Chata drwala.');
    g.place('woodcutter', x + 4, y);
    expect(buildNow(g, 'woodcutter').have).toBe('Gotowe: 0, w budowie: 1.');
    g.hq.stock.fish = 0;
    g.hq.stock.bread = 0;
    expect(buildNow(g, 'mine').warn).toContain('Nic jeszcze nie wytwarza: Chleb lub Ryby. Najpierw zbuduj: Piekarnia lub Chata rybaka.');
  });
});

describe('starting language', () => {
  const store = new Map<string, string>();
  const g = globalThis as any;
  const real = { localStorage: g.localStorage, navigator: g.navigator };
  afterEach(() => {
    store.clear();
    Object.defineProperty(g, 'localStorage', { value: real.localStorage, configurable: true });
    Object.defineProperty(g, 'navigator', { value: real.navigator, configurable: true });
  });
  const fake = (language: string) => {
    Object.defineProperty(g, 'localStorage', {
      value: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) },
      configurable: true,
    });
    Object.defineProperty(g, 'navigator', { value: { language }, configurable: true });
  };

  test('follows the browser until the player picks a language', () => {
    fake('pl-PL');
    expect(startLang()).toBe('pl');
    fake('en-GB');
    expect(startLang()).toBe('en');
  });

  test('remembers the language the player picked', () => {
    fake('en-GB');
    setLang('pl');
    expect(startLang()).toBe('pl');
  });
});
