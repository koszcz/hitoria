# Hitoria

A peaceful 2.5D settlement builder for the browser, inspired by *The Settlers*.

## Design pillars

- **No raids, ever.** Nobody attacks you. The challenge is logistics: keeping goods flowing,
  planning space, and growing your economy.
- **Watch it live.** Every log is carried by a visible settler. You can see why a building is
  idle (no trees in range, waiting for logs, no free carrier).
- **Grow by building, not by fighting.** Lookout towers expand your land instead of military
  buildings.

## Running it

Needs [Bun](https://bun.sh) (no other dependencies):

```bash
bun run dev      # http://localhost:5173  (add ?seed=123 for a fixed map)
bun run build    # static build in dist/
```

Controls: drag to pan, scroll to zoom, `1`–`5` to pick a building, `R` to draw roads, `X` to
remove roads or flags, shift-click to place several, right-click or Esc to cancel, space to pause.

## Code map

| File | What it does |
| --- | --- |
| `src/world.ts` | Seeded map generation: island, forests, boulders, mountains |
| `src/game.ts` | Simulation: buildings, settlers, task queues, carrier dispatch |
| `src/path.ts` | A* pathfinding on the tile grid |
| `src/render.ts` | Canvas isometric renderer (terrain, buildings, settlers) |
| `src/ui.ts` | HUD, build bar, info panel |
| `src/main.ts` | Input, camera, fixed-step game loop |

## Current economy

Woodcutter → logs → Sawmill → planks. Forester replants trees, Quarry breaks boulders into stone,
Lookout expands land. Everything is stored at the HQ.

Every building has a flag in front of its door. Goods only travel along roads between flags:
each road section has one carrier who passes goods from flag to flag, and a flag holds at most
8 goods, so busy roads back up. Long roads get extra flags every few tiles so more carriers share
the load. Settlers walk 1.5× faster on roads. A building that isn't connected to the HQ by road
gets no materials.

## Roadmap ideas

1. **Road upgrades.** Donkeys on busy roads, warehouses as extra hubs, demolishing buildings.
2. **Food chain.** Fisher, hunter, farm → mill → bakery, well. Miners and workers need food.
3. **Mountains and mines.** Coal, iron and gold mines, smelter, toolmaker. Tools gate new workers.
4. **Population.** Houses that grow your settler count over time.
5. **Save and load** to localStorage, plus demolish and move buildings.
6. **Goals instead of enemies.** Peaceful scenarios: build a monument, trade with a ship, survive winter.
7. **Art pass.** Sprite sheets in place of the procedural shapes.
