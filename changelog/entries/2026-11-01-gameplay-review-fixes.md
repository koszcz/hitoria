---
title: Gameplay review fixes
date: '2026-11-01 21:30'
shots:
  - name: house
    caption: The house card says that a different food grows settlers faster.
    steps:
      - key: b
      - hover: '#buildmenu .tile[data-type="house"]'
      - wait: 500
---
Four small fixes from a gameplay review:

- **Winter goal.** Only a hut worker or miner with no food can spoil the winter. A house that
  waits for food no longer counts. Fishers catch about half as many fish in winter, so stored
  bread and meat matter.
- **Mixed food.** A house grows a settler faster when it gets a different food from last time.
  A worker's meal lasts longer, and a miner digs 3 goods instead of 2.
- **Island chronicle.** The game keeps a dated list of milestones, such as the first birth, the
  first of each building, each goal and every tenth trade ship. You see it when you load a save.
- **New goal and a tool warning.** "Store 30 fish, meat or bread" replaces "Build 3 houses".
  Before you settle the other island, the game warns you when only 8 tools are left, because
  the ship needs 6.
