---
title: Smaller files and checks before every commit
date: '2026-10-31 12:00'
kind: dev
---
The drawing code is now split into small files in `src/render/`, one for each part of the picture.
A new `bun run check` checks types and file sizes. It runs before every commit and in CI.
The ship skill now brings in other sessions' work before it pushes.
