---
title: Game rules split into small files
date: '2026-10-31 11:00'
kind: dev
---
The game rules in `src/game.ts` now live in small files in `src/game/`, one for each part of the game: roads, goods, building, houses, settlers, work and saving. The game plays the same as before.

The game tests in `test/game.test.ts` are split the same way into `test/game/`. Two new tests cover settlers who cannot walk to their hut or to a tree.
