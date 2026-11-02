---
title: The same seed makes the same island on every computer
date: '2026-11-02 18:00'
kind: dev
---
The map generator and the game rules now work out sines, cosines and distances with their own
code, in `src/math/exact.ts`. `Math.sin`, `Math.cos` and `Math.hypot` could round the last digit
differently on a Mac, on Linux and in each browser. That made the same seed grow a few different
trees on GitHub than on a Mac. `bun run check` now rejects those `Math` functions in
`src/world.ts`, `src/land/` and `src/game/`.

The far island tests have their strict limits back. CI now uses the Bun version from
`package.json`, so it runs the same Bun as your computer.
