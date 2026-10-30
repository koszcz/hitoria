---
title: Build bar explains each building
date: '2026-10-30 23:00'
commit: 'e165665'
shots:
  - name: woodcutter-card
    caption: Hovering over the woodcutter's hut in the build bar.
    steps:
      - hover: '#buildbar button:nth-child(1)'
      - wait: 500
---
Hover over a button in the build bar to see a card about that building:

- what it makes, and how fast
- why you want one: which buildings need its goods
- what it needs: where it can go, a worker, its work range and build time
- what it costs and how many you already have
- warnings, such as a workshop with nothing to feed it
