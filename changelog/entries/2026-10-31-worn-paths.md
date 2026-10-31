---
title: Worn paths
date: '2026-10-31 20:30'
shots:
  - name: paths
    caption: A quarry west of the HQ. Its worker has worn dirt paths out to the boulders.
    steps:
      - key: '3'
      - hover: [-180, -70]
      - click: [-180, -70]
      - key: Escape
      - click: '#speed [data-speed="4"]'
      - wait: 40000
      - wheel: -3
      - wait: 1000
---
Settlers now wear the grass into dirt paths where they walk. The more often they walk a line,
the browner it gets, and flowers and grass on it disappear.

Settlers walk faster on worn paths, so they keep to the same lines. A path nobody uses for a
minute fades back to grass over about 3 minutes. Busy paths never fade. Your paths are saved
with the game.
