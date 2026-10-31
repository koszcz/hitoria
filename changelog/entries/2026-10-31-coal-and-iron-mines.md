---
title: Coal and iron mines
date: '2026-10-31 22:30'
shots:
  - name: coal
    caption: The Coal Mine in the build menu, in the new "Stone and ore" group.
    steps:
      - key: b
      - hover: '#buildmenu .tile[data-type="coalmine"]'
      - wait: 500
  - name: iron
    caption: The Iron Mine in the build menu. Coal and iron ore show in the goods bar.
    steps:
      - key: b
      - hover: '#buildmenu .tile[data-type="ironmine"]'
      - wait: 500
---
You can now build a Coal Mine and an Iron Mine next to a mountain. They work like the Stone Mine.
The miner eats 1 fish or bread, then digs 2 coal or 2 iron ore.

Nothing uses coal or iron ore yet. They wait in your stores for buildings that come later.
