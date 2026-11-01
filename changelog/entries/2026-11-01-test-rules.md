---
title: Rules for tests
date: '2026-11-01 11:48'
kind: dev
---
CODING_STANDARDS.md now has rules for tests. Tests use the real code, with no mocking tools. Code that reads the browser takes what it reads as an argument, so a test can pass in a fake. The saved language and the canvas that draws building signs now work this way. The game draws chance only from the island's seed. Tests check exact results where they can, and start from flat land when they place things. Existing tests that checked loosely now check the exact result. `bun run check` now fails when a test uses a mocking tool, replaces a browser global or is left with `.only` or `.skip`, and when the game calls `Math.random` or reads the clock.
