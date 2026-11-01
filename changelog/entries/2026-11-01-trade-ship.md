---
title: Trade ship
date: '2026-11-01 12:00'
shots:
  - name: trade
    caption: The trade ship tied up at the harbour, and the harbour's panel with a deal of 4 planks for 1 iron, just made.
    steps:
      - key: b
      - click: '#buildmenu .tile[data-type="harbour"]'
      - click: [125, 80]
      - key: Escape
      - click: '#speed [data-speed="4"]'
      - wait: 69000
      - click: '#speed [data-speed="1"]'
      - click: [122, 67]
      - click: '#info button.chip[data-act="give"][data-good="plank"]'
      - click: '#info button.chip[data-act="get"][data-good="iron"]'
      - wait: 300
      - click: '#info button.sail[data-act="trade"]'
      - wait: 300
      - click: '#speed [data-speed="pause"]'
      - wait: 500
---
A trade ship now visits your harbour every few minutes.

Once your first harbour on the home island is finished, a trade ship sails in from the open sea
about 3 minutes later. It ties up at the pier for about a minute and a half. Then it sails away,
and the next one comes 3 minutes after that.

While it is tied up, click the harbour. Under "You give", pick a good you can spare. Under "You
get", pick a good you lack. The panel shows the deal, such as 8 logs for 1 iron. Press "Trade" to
make it. You can make as many deals as you like while the ship is there.

The rates are fixed. Each good has a worth, from 1 for logs, stone, water and grain up to 6 for
tools. The trader keeps half the worth of what you give. The goods you give come from the harbour
first, then from your nearest stores. The goods you get go into the harbour.
