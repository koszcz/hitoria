---
title: Harbour wants
date: '2026-11-03 18:00'
shots:
  - name: wants
    caption: The new Wants list in the harbour's panel, here with 5 planks wanted.
    steps:
      - key: b
      - click: '#buildmenu .tile[data-type="harbour"]'
      - click: [125, 80]
      - key: Escape
      - click: '#fastnight'
      - click: '#speed [data-speed="4"]'
      - wait: 15000
      - click: '#speed [data-speed="pause"]'
      - click: [125, 80]
      - wait: 500
      - click: '#info button[data-act="want"][data-good="fish"][data-step="5"]'
      - click: '#info button[data-act="want"][data-good="fish"][data-step="5"]'
      - click: '#info button[data-act="want"][data-good="plank"][data-step="5"]'
      - wait: 500
---
Each harbour's panel now has a **Wants** list. Press **+** or **−** next to a good to set how many
of it the harbour's island should keep, such as 10 fish or 20 planks.

Once you have a boat at any harbour, free boats keep sailing to fetch those goods from your other
islands. Carriers there first bring the goods to their own harbour, and the boat loads up to 10
goods a trip. An island never sends goods below what its own harbour wants. The boat's line in the
panel says where it is going and what it carries.

When your settlers land on a new island, a message now says the colony needs food, from a
Fisher's Hut or by boat.
