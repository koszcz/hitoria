---
title: Carriers walk free
date: '2026-10-31 23:30'
shots:
  - name: no-road
    caption: A forester's hut whose road was removed. Carriers bring its materials across the grass.
    steps:
      - key: b
      - click: '#buildmenu .tile[data-type="forester"]'
      - click: [250, 110]
      - key: Escape
      - wait: 1000
      - key: x
      - click: [145, 90]
      - key: Escape
      - click: '#speed [data-speed="4"]'
      - wait: 15000
---
Carriers no longer need roads. They walk across the grass straight to the building that needs
the goods, and they wear dirt paths as they go.

- Goods go to the nearest store by walking distance, not road distance.
- A building with no road still gets its materials and is built.
- Roads are still faster to walk on, so carriers use them when they help.
- The ⚠ sign now shows only when settlers can't walk to a building at all, for example when
  water cuts it off. Its status says "No way to walk to your HQ".
