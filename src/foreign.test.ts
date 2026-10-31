import { expect, test } from 'bun:test';
import { isForeignError } from './foreign';

test('an error from another site, with its details hidden, is foreign', () => {
  expect(isForeignError('Script error.', null)).toBe(true);
  expect(isForeignError('Script error.', undefined)).toBe(true);
  expect(isForeignError('Script error', undefined)).toBe(true);
});

test("the game's own errors are not foreign", () => {
  expect(isForeignError('Script error.', new Error('boom'))).toBe(false);
  expect(isForeignError("TypeError: undefined is not an object", null)).toBe(false);
});
