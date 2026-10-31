---
title: Carriers walk each good the whole way
date: '2026-10-31 17:46'
shots:
  - name: village
    caption: A road to a new hut, with flags only at its ends.
    steps:
      - key: '1'
      - hover: [-130, -45]
      - click: [-130, -45]
      - key: 'Escape'
      - hover: [400, 300]
      - wait: 8000
---
Goods no longer wait on flags. A carrier now takes a good from the building that has it and walks it
along the roads, all the way to the building that needs it. When there is nothing left to carry,
the carrier walks back to the HQ.

Flags now only mark where roads end and where they meet. New roads no longer get extra flags along
the way. Finished goods wait inside their building until a carrier comes for them.

Old saves still load. Goods that were lying on flags go into the HQ.
