---
title: Well and water
date: '2026-10-31 18:30'
shots:
  - name: card
    caption: The well in the build menu, in the food group.
    steps:
      - key: b
      - hover: '#buildmenu .tile[data-type="well"]'
      - wait: 500
  - name: well
    caption: A well beside the HQ, drawing water. Water shows in the goods bar.
    steps:
      - key: b
      - click: '#buildmenu .tile[data-type="well"]'
      - hover: [-150, -90]
      - click: [-150, -90]
      - key: Escape
      - click: '#speed [data-speed="4"]'
      - wait: 20000
---
You can now build a well on any flat grass. Its worker draws 1 bucket of water every 5 seconds.

The bakery now needs 1 flour and 1 water to bake each loaf. If one is missing, the bakery tells
you which one it is waiting for. Build a well before you build a bakery.
