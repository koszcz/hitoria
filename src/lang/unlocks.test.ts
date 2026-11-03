import { afterEach, describe, expect, test } from 'bun:test';
import { setLang, tr } from '../i18n';
import { unlockPl } from './unlocks';

afterEach(() => setLang('en'));

describe('unlock messages in Polish', () => {
  test('a locked building names the buildings to finish first', () => {
    setLang('pl');
    expect(tr("Locked. Finish the Woodcutter's Hut first")).toBe('Zablokowane. Najpierw ukończ: Chata drwala');
    expect(tr('Locked. Finish the Mill and Well first')).toBe('Zablokowane. Najpierw ukończ: Młyn i Studnia');
  });

  test('the unlock message names the new buildings', () => {
    setLang('pl');
    expect(tr("🔓 Unlocked: Forester's Hut, Sawmill")).toBe('🔓 Odblokowano: Chata leśnika, Tartak');
  });

  test('other messages and unknown names are left alone', () => {
    expect(unlockPl('Outside your land')).toBeNull();
    expect(unlockPl('Locked. Finish the Castle first')).toBeNull();
    expect(unlockPl('🔓 Unlocked: Castle')).toBeNull();
  });
});
