---
title: Sail to settle
date: '2026-11-01 03:23'
before: d3e5dc9
shots:
  - name: voyage
    caption: The ship on its way to the other island, with settlers and crates on deck.
    steps:
      - key: b
      - click: '#buildmenu .tile[data-type="harbour"]'
      - click: [125, 80]
      - key: Escape
      - click: '#speed [data-speed="4"]'
      - wait: 12000
      - click: '#speed [data-speed="1"]'
      - click: [122, 67]
      - wheel: 4
      - click: '#info button.sail'
      - wait: 2500
  - name: landed
    caption: The settlers' new harbour on the other island, with its own land around it.
    steps:
      - key: b
      - click: '#buildmenu .tile[data-type="harbour"]'
      - click: [125, 80]
      - key: Escape
      - click: '#speed [data-speed="4"]'
      - wait: 12000
      - click: [122, 67]
      - wheel: 4
      - click: '#info button.sail'
      - wait: 6000
      - click: '#speed [data-speed="pause"]'
---
Your settlers can now sail to the other island and settle it.

Click a finished Harbour to see "Sail to settle". A ship takes 5 idle settlers from the HQ, with
12 planks and 8 stone from your stores. Press "Set sail" once you have them all. The panel shows
what is still missing.

The ship sails to the nearest free shore on the other island. There the settlers clear the trees
and boulders around them, which gives them logs and stone, and build a harbour with part of the
goods. The rest of the goods go into it. The new harbour claims the land 6 tiles around it. Then
the ship sails home and ties up at your harbour's pier.

The new harbour is the island's home, like the HQ. Its settlers build, work and carry goods there.
Buildings on the island take their goods from it and bring what they make back to it. Settlers
never cross the sea on foot, and a house on the island adds its new settlers to the island's
harbour.

Settlers sail once. If their landing spot is taken by the time they arrive, they sail back with
everything, and you can send them again.
