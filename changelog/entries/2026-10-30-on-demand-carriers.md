---
title: Carriers only work roads that have goods to move
date: '2026-10-30 23:22'
shots:
  - name: empty-road
    caption: A road from the HQ with nothing on it, a few seconds after it was drawn. Check the idle count at the top.
    steps:
      - key: 'r'
      - click: [-40, -15]
      - wait: 300
      - click: [90, -45]
      - wait: 300
      - key: 'Escape'
      - key: 'Escape'
      - wait: 4000
---
Before, every road section kept its own carrier, even when there was nothing to carry. Long roads used up most of your settlers, so new building sites waited for a builder.

Now a carrier comes out only when goods are waiting on a road. After about 12 seconds with nothing to carry, the carrier goes back to the HQ. That settler can then build or work somewhere else.
