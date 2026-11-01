---
title: No player roads
date: '2026-11-01 19:00'
before: b7336fb
shots:
  - name: village
    caption: A new woodcutter's hut, with no road or flag. Settlers walk to it across the grass, and the bar has no road tool.
    steps:
      - key: '1'
      - click: [160, -40]
      - key: Escape
      - wait: 15000
---
You no longer build roads. Settlers walk across the grass to every building, and their footsteps
wear it into dirt paths by themselves. Busy paths are quicker to walk, so settlers keep to them.

These are gone:

- the road tool and its `R` key
- the flags in front of buildings
- the road that each new building got on its own
- the warning sign over buildings with no road

The Remove tool (`X`) now removes buildings only.

The tile in front of each door stays open. You can't build on it, so settlers can always get in.
A building may now stand right beside another one.

Saves from before this change still load. Their roads and flags become worn paths, so your
village keeps its tracks.
