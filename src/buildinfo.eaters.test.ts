import { afterEach, describe, expect, test } from 'bun:test';
import { buildFacts, workerEaters } from './buildinfo';
import { setLang } from './i18n';

afterEach(() => setLang('en'));

const LIST = "Woodcutter's Hut, Forester's Hut, Quarry, Sawmill, Farm, Mill, Well, Smelter, Toolmaker's Workshop and Geologist's Hut";

describe('food cards name the workers who eat the food', () => {
  test('workers in every hut that is not fed from its own pile eat food from your stores', () => {
    expect(workerEaters()).toEqual(['woodcutter', 'forester', 'quarry', 'sawmill', 'farm', 'mill', 'well', 'smelter', 'toolmaker', 'geologist']);
  });

  test('the Fisher, Hunter and Bakery cards list them', () => {
    expect(buildFacts('fisher').worth).toContain(`Fish also feeds the workers in the ${LIST}.`);
    expect(buildFacts('hunter').worth).toContain(`Meat also feeds the workers in the ${LIST}.`);
    expect(buildFacts('bakery').worth).toContain(`Bread also feeds the workers in the ${LIST}.`);
  });

  test('cards for goods that are not food do not list them', () => {
    for (const t of ['sawmill', 'mill', 'well', 'quarry'] as const) expect(buildFacts(t).worth.some((w) => w.includes('feeds the workers'))).toBe(false);
  });

  test('the line is in Polish too', () => {
    setLang('pl');
    expect(buildFacts('fisher').worth).toContain(
      'Ryby jedzą też pracownicy: Chata drwala, Chata leśnika, Kamieniołom, Tartak, Gospodarstwo, Młyn, Studnia, Huta, Warsztat narzędziarza i Chata geologa.',
    );
  });
});
