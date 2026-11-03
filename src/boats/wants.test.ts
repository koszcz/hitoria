import { afterEach, describe, expect, test } from 'bun:test';
import { BOAT_PLANKS } from '../game';
import { colonyGame, harbourGame } from '../game/test-helpers';
import { setLang } from '../i18n';
import { boatRows } from './panel';
import { tripLine, wantRows } from './wants';

afterEach(() => setLang('en'));

describe('the wants in the harbour panel', () => {
  test('a finished harbour lists every good with − and + buttons', () => {
    const { g, h } = harbourGame();
    g.setWant(h, 'fish', 10);
    const html = wantRows(g, h);
    expect(html).toContain('<h4>📦 Wants</h4>');
    expect(html).toContain('Boats fetch goods from your other islands until this island has this many.');
    expect(html).toContain('<span class=""><button class="chip" data-act="want" data-good="fish" data-step="-5" title="Want 5 fewer Fish">−</button><span class="good fish" title="Fish"></span>10<button class="chip" data-act="want" data-good="fish" data-step="5" title="Want 5 more Fish">+</button></span>');
    expect(html).toContain('data-good="plank" data-step="-5" title="Want 5 fewer Planks" disabled>');
    expect(html.match(/data-step="5"/g)!.length).toBe(13);
  });

  test('the + button stops at the most a harbour can want', () => {
    const { g, h } = harbourGame();
    g.setWant(h, 'stone', 50);
    expect(wantRows(g, h)).toContain('data-good="stone" data-step="5" title="Want 5 more Stone" disabled>');
  });

  test('it asks for a boat until some harbour has one', () => {
    const { g, h } = harbourGame();
    expect(wantRows(g, h)).toContain('<p class="warn">Build a boat at any harbour to fetch them.</p>');
    h.boat = BOAT_PLANKS;
    expect(wantRows(g, h)).not.toContain('class="warn"');
  });

  test('other buildings and an unfinished harbour show nothing', () => {
    const { g, h } = harbourGame(1, false);
    expect(wantRows(g, g.hq)).toBe('');
    expect(wantRows(g, h)).toBe('');
  });

  test('the wants are in Polish too', () => {
    const { g, h } = harbourGame();
    setLang('pl');
    expect(wantRows(g, h)).toContain('<h4>📦 Zamówienia</h4>');
  });
});

describe('the boat on a trip', () => {
  test('the boat line says where the boat is and what it carries', () => {
    const { g, h, colony } = colonyGame();
    const trip = { from: h.id, to: colony.id, g: 'fish' as const, n: 10, load: 4, leg: 'out' as const, x: 0, y: 0, path: [], wait: 0 };
    expect(tripLine(g, trip)).toBe('Sailing to the home island for 10 fish');
    expect(tripLine(g, { ...trip, leg: 'load' })).toBe('Loading fish on the home island: 4 / 10');
    expect(tripLine(g, { ...trip, leg: 'carry' })).toBe('Bringing 4 fish to the other island');
    expect(tripLine(g, { ...trip, leg: 'home' })).toBe('Sailing home');
    setLang('pl');
    expect(tripLine(g, { ...trip, leg: 'carry' })).toBe('Wiezie na drugą wyspę: ryby ×4');
    expect(tripLine(g, { ...trip, leg: 'load' })).toBe('Ładuje towar (ryby) na wyspie domowej: 4 / 10');
    colony.boat = BOAT_PLANKS;
    colony.trip = { ...trip, leg: 'home' };
    expect(boatRows(g, colony)).toBe('<h4>⛵ Łódź</h4><div>Wraca do domu</div>');
  });
});
