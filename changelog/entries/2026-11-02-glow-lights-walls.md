---
title: Glow lights the walls
date: '2026-11-02 16:00'
shots:
  - name: night
    caption: At night the HQ's walls take a warm tint from its pool of light, brightest near the ground and the door.
    steps:
      - click: '#fastnight'
      - click: '#speed [data-speed="4"]'
      - wait: 100000
      - click: '#speed [data-speed="pause"]'
      - hover: [0, 0]
      - wheel: -6
      - wait: 1500
---
At night, the walls of your finished buildings now catch their own warm light. The glow is
brightest near the ground and around the door, and it fades toward the roof. It fades in at
dusk and out at dawn, along with the pool of light on the ground.
Building sites and settlers stay as they were.
