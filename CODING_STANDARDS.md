# Coding standards

Check every change against these rules when you review it. `bun run check` already enforces the
rules that a script can test, so this file only holds the rules that need judgement.

## Keep files small

A file should hold one idea, so an agent can read the whole file without searching through it.

- `bun run check` fails when a file in `src/`, `scripts/`, `changelog/` or `ideas/` passes
  400 lines. The pre-commit hook and CI both run it.
- Some files were already too long when the check started. They are listed in `OVERSIZE` in
  [scripts/check-size.ts](scripts/check-size.ts), and each may not grow. When you touch one,
  move a part of it into its own file if you can.
- When a file gets close to the limit, split it by what it is about, not by line count. A file
  called `misc.ts` or `part2.ts` is a sign the split went wrong.

## Group files in folders by domain

A domain is one part of the game, such as drawing, roads, settlers or saving.

- Put the files for one domain in one folder, such as `src/render/`.
- Name each file after the thing it holds: `terrain.ts`, `roads.ts`, `people.ts`.
- Start each file with a one- or two-line comment that says what it holds.
- A file imports from its own folder freely. It imports from another domain only through that
  domain's main types and functions. If two folders import each other's details, the line
  between them is in the wrong place.
- Put each test file next to the file it tests, with `.test.ts` in place of `.ts`. For example,
  the tests for `src/path.ts` go in `src/path.test.ts`. Tests that cover a whole domain go in
  that domain's folder, such as `src/game/production.test.ts`.
- Shared test setup for the game lives in `src/game/test-helpers.ts`.
- When a new feature does not fit any folder, add a folder for it rather than a new top-level
  file in `src/`.

## Write tests that use the real code

A test should run the same code the player runs, and give the same result every time.

`bun run check` enforces the first four rules. The pre-commit hook and CI both run it.

1. Don't use mocking tools, such as `mock`, `spyOn` or `setSystemTime`. Don't replace browser
   globals, such as `localStorage` or `navigator`, from a test. Instead, let the code take what
   it reads from outside the game as an argument, and pass a fake from the test. For example,
   `MuteChoice` takes the store it saves to, `startLang` takes the store and the browser's
   languages, and `makeBuilding` takes the textures for its sign and smoke.
2. Don't call `Math.random`, `Date.now` or `performance.now` in `src/game/`. Use `g.rand`, which
   comes from the island's seed, and game time. Otherwise a test can pass on one run and fail on
   the next.
3. In `src/world.ts`, `src/land/` and `src/game/`, use `sin`, `cos` and `hypot` from
   `src/math/exact.ts`, not `Math.sin`, `Math.cos` or `Math.hypot`. Don't use `**` or other
   `Math` functions, such as `atan2`, `pow` or `exp`. Browsers and operating systems may round
   them differently, so the same seed would make a different island on another machine.
4. Don't commit `.only` or `.skip`. They turn off other tests without anyone noticing.
5. Check for the exact result when you know it. Write `expect(hq.stock.plank).toBe(3)`, not
   `toBeGreaterThan(0)` or `toBeTruthy()`. A loose check passes when the code is wrong in a new
   way. Use one only when the exact value depends on things the test does not control.
6. Start a game test with `flatGame` from `src/game/test-helpers.ts` when the test places
   buildings, roads or trees. It clears the land around the HQ, so the test does not depend on
   how the map generator lays out a seed. Use `new Game(seed)` only to test the generated map
   itself.
