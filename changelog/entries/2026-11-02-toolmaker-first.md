---
title: Tools for the Toolmaker first
date: '2026-11-02 18:00'
shots:
  - name: card
    caption: The Toolmaker's Workshop card in the build menu.
    steps:
      - key: b
      - hover: '#buildmenu .tile[data-type="toolmaker"]'
      - wait: 500
---
When your tools run out, a finished Toolmaker's Workshop that waits for a tool now gets the next
free tool before any other hut. Its worker can then start making tools, so the other huts get
theirs sooner and the tool chain never stalls.

The Toolmaker's Workshop card in the build menu now says so, next to the reminder that every new
worker in a hut needs 1 tool.
