---
title: Harbour boats
date: '2026-11-03 12:00'
shots:
  - name: boat
    caption: The harbour's panel once the boat is finished.
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
      - click: '#info button[data-act="boat"]'
      - click: '#speed [data-speed="4"]'
      - wait: 22000
      - click: '#speed [data-speed="pause"]'
      - wait: 500
  - name: closeup
    caption: The finished boat tied up at the end of the harbour's pier.
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
      - click: '#info button[data-act="boat"]'
      - click: '#speed [data-speed="4"]'
      - wait: 22000
      - click: '#speed [data-speed="pause"]'
      - key: Escape
      - hover: [90, 220]
      - wheel: -4
      - wait: 800
---
Each harbour can now build a small boat. Open the harbour's panel and press **Build a boat**.
Carriers bring 6 planks from your stores on the same island, and the panel counts the planks as
they come in. Planks already stored in the harbour go into the boat first.

Once the last plank is in, a message says the boat has tied up, and you see it bobbing at the end
of the pier. Each harbour can have one boat, at home and on every colony. Boats don't sail yet.
