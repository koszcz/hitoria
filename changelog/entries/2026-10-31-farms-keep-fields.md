---
title: Farms keep their own fields
date: '2026-10-31 18:30'
shots:
  - name: placing
    caption: Placing a farm. The tan tiles are the 6 fields it will take.
    steps:
      - key: '8'
      - hover: [110, 50]
      - wait: 300
      - hover: [112, 52]
      - wait: 500
  - name: placed
    caption: The farm a little later, with its fields tilled and the first grain coming up.
    steps:
      - key: '8'
      - hover: [112, 52]
      - click: [112, 52]
      - key: 'Escape'
      - hover: [400, 300]
      - click: '#speed [data-speed="4"]'
      - wait: 12000
---
A farm sometimes said "Waiting for the grain to ripen" while nothing grew. It had no free grass
near it to sow, so it sowed nothing.

Now every farm keeps 6 fields of its own:

- You can place a farm only where it has room for 6 fields. While you place it, its fields show
  as tan tiles.
- The fields show as tilled soil as soon as you place the farm.
- No buildings, flags, roads or trees can go on a field. Settlers can still walk across.
- A farmer sows and harvests only its own farm's fields.
- When you demolish a farm, its fields turn back into free grass.

Old saves still load. Their farms get as many fields as fit around them, up to 6.
