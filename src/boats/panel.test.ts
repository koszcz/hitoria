import { afterEach, describe, expect, test } from 'bun:test';
import { harbourGame } from '../game/test-helpers';
import { setLang } from '../i18n';
import { boatRows } from './panel';

afterEach(() => setLang('en'));

describe('the boat in the harbour panel', () => {
  test('a finished harbour shows the Build a boat button', () => {
    const { g, h } = harbourGame();
    expect(boatRows(g, h)).toBe('<h4>⛵ Boat</h4><button class="sail" data-act="boat">⛵ Build a boat (6 planks)</button>');
    setLang('pl');
    expect(boatRows(g, h)).toContain('⛵ Zbuduj łódź (6 desek)');
  });

  test('while the boat is built, it shows the planks put in so far', () => {
    const { g, h } = harbourGame();
    g.orderBoat(h);
    h.boat = 2;
    expect(boatRows(g, h)).toBe('<h4>⛵ Boat</h4><div><span class="good plank"></span>Planks: 2 / 6</div>');
  });

  test('once the boat is finished, it says the boat is tied up', () => {
    const { g, h } = harbourGame();
    h.boat = 6;
    expect(boatRows(g, h)).toBe('<h4>⛵ Boat</h4><div>Your boat is tied up at the dock.</div>');
    setLang('pl');
    expect(boatRows(g, h)).toBe('<h4>⛵ Łódź</h4><div>Twoja łódź cumuje przy pomoście.</div>');
  });

  test('other buildings and an unfinished harbour show nothing', () => {
    const { g, h } = harbourGame(1, false);
    expect(boatRows(g, g.hq)).toBe('');
    expect(boatRows(g, h)).toBe('');
  });
});
