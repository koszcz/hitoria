---
title: The same island plays out the same way
date: '2026-11-01 12:00'
kind: dev
---
The game now draws its random numbers from the island's seed, not from the browser. This covers where wild animals wander, how long they graze, where a returning animal lives, which tile a forester or farmer picks, and whether a new tree is a conifer. Two tests used to fail now and then because of this: the README village was sometimes not fully built in time, and a freed deer sometimes wandered back to the tile it started on. Both now give the same result on every run.
