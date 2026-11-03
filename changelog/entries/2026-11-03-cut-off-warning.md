---
title: Warning when a building cuts off the HQ
date: '2026-11-03 21:00'
shots:
  - name: refused
    caption: A ring of houses leaves one way in to the house in the middle. A house on that way is refused, with the reason.
    steps:
      - key: b
      - click: '#buildmenu .tile[data-type="house"]'
      - click: [0, -152]
      - key: b
      - click: '#buildmenu .tile[data-type="house"]'
      - click: [-83, -149]
      - key: b
      - click: '#buildmenu .tile[data-type="house"]'
      - click: [0, -100]
      - key: b
      - click: '#buildmenu .tile[data-type="house"]'
      - click: [-166, -143]
      - key: b
      - click: '#buildmenu .tile[data-type="house"]'
      - click: [0, -56]
      - key: b
      - click: '#buildmenu .tile[data-type="house"]'
      - click: [-83, -101]
      - key: b
      - click: '#buildmenu .tile[data-type="house"]'
      - click: [-166, -101]
      - key: b
      - click: '#buildmenu .tile[data-type="house"]'
      - click: [-83, -57]
      - key: b
      - click: '#buildmenu .tile[data-type="house"]'
      - click: [-166, -59]
      - wait: 400
---
The game now refuses a building that would block the last path between another building and
your HQ or harbour. A message says why: "This would cut off another building from your HQ".
Before, the building went up anyway, and the building behind it was stuck with "No way to walk
to your HQ".
