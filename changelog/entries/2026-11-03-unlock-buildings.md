---
title: Unlock buildings step by step
date: '2026-11-03 18:00'
shots:
  - name: menu
    caption: On a new island, most buildings are greyed out. The Farm's card says to finish a Sawmill first.
    steps:
      - key: b
      - hover: '#buildmenu .tile[data-type="farm"]'
      - wait: 500
---
A new island now starts with four buildings: the Woodcutter's Hut, Quarry, Fisher's Hut and
House. Each finished building unlocks the next ones in its chain. For example, a Woodcutter's
Hut unlocks the Forester's Hut and the Sawmill, and a Sawmill unlocks the Farm, Hunter's Lodge,
Storehouse and Lookout Tower.

In the build menu, locked buildings are greyed out. Their card says which building to finish
first. A message names each building as it unlocks. An unlock stays, even if you remove the
building that earned it. Saved games unlock what their finished buildings have earned.
