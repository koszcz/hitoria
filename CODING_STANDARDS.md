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
