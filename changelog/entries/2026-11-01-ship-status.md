---
title: Sessions say clearly whether work shipped
date: '2026-11-01 12:30'
kind: dev
---
The `ship` skill now checks that the push reached `main`. Its last message starts with "Shipped", "Not shipped" or "Nothing to ship". Work that ends without the `ship` skill now starts its last message with "Not shipped." and offers to ship.
