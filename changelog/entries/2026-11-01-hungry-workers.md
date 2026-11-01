---
title: Hungry workers
date: '2026-11-01 20:00'
shots:
  - name: hungry
    caption: A new woodcutter with no food. A bowl floats over the hut, and the panel says the worker is hungry.
    steps:
      - key: '1'
      - click: [160, -40]
      - key: Escape
      - click: '#speed button[data-speed="4"]'
      - wait: 16000
      - click: '#speed button[data-speed="1"]'
      - hover: [160, -45]
      - wheel: -5
      - wait: 300
      - click: [90, -30]
      - wait: 500
  - name: card
    caption: The build card says how much the worker eats.
    steps:
      - key: b
      - hover: '#buildmenu .tile[data-type="sawmill"]'
      - wait: 500
---
Every worker in a hut now needs food, not just miners. Carriers and builders do not.

- A worker eats 1 fish, meat or bread for every 60 seconds of work.
- Carriers bring each hut a small lunchbox of 2 food.
- A worker with no food still works, but at half speed.
- A bowl floats over a hut whose worker is hungry. Click the hut to see why.
- Fishers, hunters and bakers eat from what their own hut makes, so they need no food brought in.
- Miners eat as they dig, the same as before.
- A worker who waits for goods eats nothing.
