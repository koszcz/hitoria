---
title: Smooth road bends
date: '2026-10-31 14:00'
shots:
  - name: road
    caption: A road from the HQ to a Forester's Hut, with a bend near the hut.
    steps:
      - click: '#buildbar button:nth-child(2)'
      - hover: [-60, -95]
      - click: [-60, -95]
      - key: 'Escape'
      - key: 'r'
      - click: [-40, -12]
      - click: [-122, -128]
      - key: 'Escape'
      - hover: [300, 200]
      - wait: 500
---
Roads now curve gently where they change direction, instead of turning at a sharp angle. The road preview you see while drawing a road curves the same way.
