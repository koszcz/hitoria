---
title: Map checks pass on Linux too
date: '2026-10-31 22:32'
kind: dev
---
The tests that check each map version keeps building the same land now round numbers before
they compare. The checks on GitHub failed because a height could differ in its last digit
between a Mac and Linux. That digit changes nothing in the game.
