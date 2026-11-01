---
title: Trader wants
date: '2026-11-01 23:30'
shots:
  - name: wants
    caption: The harbour's panel while the trade ship is tied up, with the goods it wants and the rare goods it sells.
    steps:
      - key: b
      - click: '#buildmenu .tile[data-type="harbour"]'
      - click: [125, 80]
      - key: Escape
      - click: '#fastnight'
      - click: '#speed [data-speed="4"]'
      - wait: 69000
      - click: '#speed [data-speed="pause"]'
      - click: [122, 67]
      - wait: 500
---
Each trade ship now has its own wishes, so it pays to check what it wants before you trade.

- **Goods it wants.** Each ship wants 2 goods, marked with ⭐. When you give one of them, the
  trader pays its full worth instead of keeping half. For example, 3 fish now buy 2 bread
  instead of 1.
- **Rare goods.** Each ship sells 2 rare goods, marked with 💎, such as coal or bread. You buy
  them at their full worth, but each ship carries only 6 of each.
- **Tools and iron run out.** Each ship sells only 2 tools and 4 iron. The "You get" row shows
  how many it has left.

All other goods trade as before, at the usual rate, with no limit.
