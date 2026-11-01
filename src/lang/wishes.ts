// Village wishes and their toasts in Polish. The English ones live with the wishes, in src/game/wishes.ts.

export const WISHES_PL: Record<string, string> = {
  'Make 40 planks': 'Zrób 40 desek',
  'Bake 15 bread': 'Upiecz 15 bochenków chleba',
  'Catch 20 fish': 'Złów 20 ryb',
  'Bring home 10 meat': 'Przynieś 10 porcji mięsa',
  'Make 5 tools': 'Zrób 5 narzędzi',
  'Welcome 4 new settlers': 'Powitaj 4 nowych osadników',
  'Welcome 1 trade ship': 'Przyjmij 1 statek kupiecki',
  'Upgrade 2 buildings': 'Ulepsz 2 budynki',
  'Sell the trader 8 goods it wants': 'Sprzedaj kupcowi 8 towarów, których szuka',
  'Land on the far island': 'Wyląduj na dalekiej wyspie',
};

// Store wishes ask for a number that depends on what you had when they began.
const STORES_PL: [RegExp, (n: string) => string][] = [
  [/^Store (\d+) fish, meat or bread$/, (n) => `Zgromadź ${n} ryb, porcji mięsa lub bochenków chleba`],
  [/^Store (\d+) stone$/, (n) => `Zgromadź ${n} kamieni`],
];

// A wish in Polish, or null if `text` is not one.
export function wishPl(text: string): string | null {
  if (WISHES_PL[text]) return WISHES_PL[text];
  for (const [re, pl] of STORES_PL) {
    const m = text.match(re);
    if (m) return pl(m[1]);
  }
  return null;
}

const TOASTS_PL: [RegExp, string][] = [
  [/^🌟 The village wishes: (.+)$/, '🌟 Wioska ma życzenie: '],
  [/^🌟 Wish granted: (.+)$/, '🌟 Życzenie spełnione: '],
  [/^🍂 The wish passed: (.+)$/, '🍂 Życzenie minęło: '],
];

// A wish toast in Polish, or null if `msg` is not one.
export function wishToastPl(msg: string): string | null {
  for (const [re, pl] of TOASTS_PL) {
    const m = msg.match(re);
    if (m) return pl + (wishPl(m[1]) ?? m[1]);
  }
  return null;
}
