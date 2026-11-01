---
title: Island riches
date: '2026-11-01 05:10'
shots:
  - name: island
    caption: The other island now has a mountain of rust-brown rock, where coal and iron ore lie.
    steps:
      - wheel: 10
      - wait: 800
  - name: refused
    caption: A coal mine can't go by the home mountain, because it holds stone only.
    steps:
      - key: b
      - click: '#buildmenu .tile[data-type="coalmine"]'
      - click: [260, 95]
      - wait: 300
---
Coal and iron ore now lie only in the mountains of the other island. The mountains on your home
island hold stone only, so a Stone Mine still works there.

The other island has a new mountain of rust-brown rock with dark seams of coal. Sail to settle
the island, then build a Coal Mine and an Iron Mine at the foot of its mountain. If you try to
build them by a home mountain, the game tells you that coal and iron lie only on the other island.

Saved games keep the ore they have: in a game you started before this change, every mountain
still holds coal and iron ore.
