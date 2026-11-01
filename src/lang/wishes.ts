// Village wishes and their toasts in Polish. The English ones live with the wishes, in src/game/wishes.ts.

export const WISHES_PL: Record<string, string> = {
  'Store 40 fish, meat or bread': 'Zgromadź 40 ryb, porcji mięsa lub bochenków chleba',
  'Store 40 stone': 'Zgromadź 40 kamieni',
  'Make 40 planks': 'Zrób 40 desek',
  'Bake 15 bread': 'Upiecz 15 bochenków chleba',
  'Catch 20 fish': 'Złów 20 ryb',
  'Bring home 10 meat': 'Przynieś 10 porcji mięsa',
  'Make 5 tools': 'Zrób 5 narzędzi',
  'Welcome 4 new settlers': 'Powitaj 4 nowych osadników',
  'Welcome 2 trade ships': 'Przyjmij 2 statki kupieckie',
};

const TOASTS_PL: [RegExp, string][] = [
  [/^🌟 The village wishes: (.+)$/, '🌟 Wioska ma życzenie: '],
  [/^🌟 Wish granted: (.+)$/, '🌟 Życzenie spełnione: '],
  [/^🍂 The wish passed: (.+)$/, '🍂 Życzenie minęło: '],
];

// A wish toast in Polish, or null if `msg` is not one.
export function wishToastPl(msg: string): string | null {
  for (const [re, pl] of TOASTS_PL) {
    const m = msg.match(re);
    if (m) return pl + (WISHES_PL[m[1]] ?? m[1]);
  }
  return null;
}
