---
title: Warn before trees run out
date: '2026-11-02 20:47'
shots:
  - name: hint
    caption: Placing a Sawmill next to a Forester's Hut site.
    steps:
      - wait: 1500
      - key: '2'
      - click: [160, 40]
      - key: '4'
      - hover: [160, 110]
      - wait: 500
  - name: card
    caption: The Woodcutter's Hut card in the build menu.
    steps:
      - key: b
      - hover: '#buildmenu .tile[data-type="woodcutter"]'
      - wait: 500
---
Woodcutters no longer run out of trees without warning.

- A message tells you when a Woodcutter's Hut has 3 or fewer grown trees left and no Forester's
  Hut plants trees in its reach. Build a Forester's Hut near it to plant more.
- While you place a building, a hint above the Done button says when the building takes ground a
  Forester's Hut could plant trees on.
- The Woodcutter's Hut card says that trees run out unless a Forester's Hut nearby replants them.
