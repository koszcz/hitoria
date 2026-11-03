---
title: Rising house prices
date: '2026-11-03 12:00'
shots:
  - name: menu
    caption: After one House site, the next House costs 4 planks and 3 stone.
    steps:
      - key: b
      - click: '#buildmenu .tile[data-type="house"]'
      - click: [120, 90]
      - key: Escape
      - wait: 300
      - key: b
      - hover: '#buildmenu .tile[data-type="house"]'
      - wait: 500
---
Each House now costs 1 more plank and 1 more stone than the last. The first House still costs
3 planks and 2 stone, and the 20th costs 22 planks and 21 stone. Houses on every island count.

A House site keeps the price it had when you placed it. If you remove a House, the next one
gets cheaper again. Other buildings keep their price. The build menu, the House card and the
site's panel show the current price.
